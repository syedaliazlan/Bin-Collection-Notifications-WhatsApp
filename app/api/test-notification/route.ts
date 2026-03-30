import { NextRequest, NextResponse } from "next/server";
import { WithId } from "mongodb";
import { getDatabase } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/greenapi";
import { Tenant } from "@/lib/models/Tenant";
import { Schedule, BinType } from "@/lib/models/Schedule";
import { Notification } from "@/lib/models/Notification";
import { RotationState } from "@/lib/models/RotationState";
import { getWeekNumber, getBinTypesForWeek } from "@/lib/schedule-utils";
import { createNotificationMessage } from "@/lib/message-templates";

export async function POST(request: NextRequest) {
  try {
    let body: { type?: "put-out" | "bring-in"; weekOffset?: number } = {};
    try {
      body = await request.json();
    } catch {
      // No body or invalid JSON is fine; use defaults
    }
    const type: "put-out" | "bring-in" = body.type === "bring-in" ? "bring-in" : "put-out";
    const weekOffset = Math.min(Math.max(Number(body.weekOffset) || 0, 0), 8);

    const db = await getDatabase();
    const tenantsCollection = db.collection<Tenant>("tenants");
    const schedulesCollection = db.collection<Schedule>("schedules");
    const notificationsCollection = db.collection<Notification>("notifications");
    const rotationCollection = db.collection<RotationState>("rotation_states");

    // Get active schedule, or use default (same as GET /api/schedule) so test works before any schedule is saved
    let schedule = await schedulesCollection.findOne({});
    if (!schedule) {
      schedule = {
        _id: "",
        collectionDay: "Monday",
        binTypes: ["general_waste", "paper_card", "glass_cans_plastics"],
        weekPattern: "all",
        notificationTime: "17:00",
        bringInTime: "17:00",
        groupChatId: process.env.GREEN_API_GROUP_CHAT_ID || "",
        testChatId: process.env.GREEN_API_TEST_CHAT_ID || "",
        rotationEnabled: true,
      } as WithId<Schedule>;
    }

    // Calculate NEXT COLLECTION DATE first (same logic as hero/next-collection API)
    // This ensures weekOffset=0 matches exactly what the hero shows
    const today = new Date();
    const nextCollectionDate = new Date(today);
    const daysUntilMonday = (1 - nextCollectionDate.getDay() + 7) % 7 || 7;
    nextCollectionDate.setDate(today.getDate() + daysUntilMonday);
    
    // Add weekOffset weeks to the next collection date
    const targetCollectionDate = new Date(nextCollectionDate);
    targetCollectionDate.setDate(targetCollectionDate.getDate() + (weekOffset * 7));
    
    // Use the TARGET collection date's week to determine bin types
    const targetWeekNumber = getWeekNumber(targetCollectionDate);
    const isOddWeek = targetWeekNumber % 2 === 1;
    const binTypes = getBinTypesForWeek(isOddWeek);

    if (binTypes.length === 0) {
      return NextResponse.json(
        { error: "No collections scheduled for this week" },
        { status: 400 }
      );
    }

    // Get TEST chat ID from schedule or environment (separate from live notifications)
    const testChatId = schedule.testChatId || process.env.GREEN_API_TEST_CHAT_ID || schedule.groupChatId || process.env.GREEN_API_GROUP_CHAT_ID || "";
    
    if (!testChatId) {
      return NextResponse.json(
        { error: "No test chat ID configured. Please set a Test Chat ID on the dashboard or testChatId in schedule." },
        { status: 400 }
      );
    }

    // Get active tenants for rotation tracking
    const tenants = await tenantsCollection
      .find({ active: true })
      .sort({ rotationOrder: 1 })
      .toArray();

    // Determine responsible tenant using GLOBAL rotation state
    // weekOffset=0: Same as hero (next collection) = currentTenantIndex
    // weekOffset=1: Collection after next = currentTenantIndex + 1
    // etc.
    let responsibleTenant: Tenant | null = null;
    let debugInfo: any = {
      rotationEnabled: schedule.rotationEnabled,
      tenantsCount: tenants.length,
      tenantNames: tenants.map((t, i) => `[${i}] ${t.name} (order: ${t.rotationOrder})`),
    };
    
    if (schedule.rotationEnabled && tenants.length > 0) {
      // Use global rotation key for consistent rotation across all weeks
      const rotationState = await rotationCollection.findOne({ binType: "global" });
      const currentIndex = rotationState?.currentTenantIndex ?? 0;
      // For weekOffset=0, use currentIndex (matches hero)
      // For weekOffset>0, simulate rotation advancing
      const simulatedIndex = (currentIndex + weekOffset) % tenants.length;
      responsibleTenant = tenants[simulatedIndex] || tenants[0];
      
      debugInfo.currentIndexFromDB = currentIndex;
      debugInfo.weekOffset = weekOffset;
      debugInfo.simulatedIndex = simulatedIndex;
      debugInfo.selectedTenant = responsibleTenant?.name;
      debugInfo.calculation = `(${currentIndex} + ${weekOffset}) % ${tenants.length} = ${simulatedIndex}`;
    } else if (tenants.length > 0) {
      responsibleTenant = tenants[0];
      debugInfo.note = "Rotation disabled, using first tenant";
    }
    
    console.log("[TEST-NOTIFICATION] Rotation debug:", JSON.stringify(debugInfo, null, 2));

    // Send test notification to the TEST chat ID (put-out or bring-in)
    const result = await sendTestNotificationToGroup(
      testChatId,
      binTypes,
      notificationsCollection,
      responsibleTenant,
      type
    );

    return NextResponse.json({
      success: result.status === "success",
      type,
      weekOffset,
      weekNumber: targetWeekNumber,
      targetDate: targetCollectionDate.toISOString().split('T')[0],
      isOddWeek,
      binTypes,
      rotationEnabled: schedule.rotationEnabled,
      responsibleTenant: responsibleTenant?.name || null,
      testChatId,
      result,
      message: result.status === "success"
        ? `Test ${type} notification sent to ${testChatId}`
        : `Failed to send test notification: ${result.error}`,
      // Debug info for troubleshooting rotation issues
      debug: debugInfo,
    });
  } catch (error) {
    console.error("Error in test notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function sendTestNotificationToGroup(
  chatId: string,
  binTypes: BinType[],
  notificationsCollection: any,
  responsibleTenant: Tenant | null = null,
  type: "put-out" | "bring-in" = "put-out"
): Promise<{ status: "success" | "failed"; message?: string; error?: string }> {
  const message = createNotificationMessage(binTypes, type, responsibleTenant, { isTest: true });
  
  // Determine recipient name based on chat ID format
  const isGroupChat = chatId.includes("@g.us");
  const recipientName = isGroupChat ? "Group Chat (Test)" : "Personal (Test)";

  try {
    const messageId = await sendWhatsAppMessage(chatId, message);
    await notificationsCollection.insertOne({
      sentAt: new Date(),
      recipient: chatId,
      recipientName,
      binTypes,
      status: "success",
      message,
      responsibleTenant: responsibleTenant?.name || null,
      notificationType: type,
      isTest: true,
      createdAt: new Date(),
    });
    return {
      status: "success",
      message: `Message sent successfully (ID: ${messageId})`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await notificationsCollection.insertOne({
      sentAt: new Date(),
      recipient: chatId,
      recipientName,
      binTypes,
      status: "failed",
      message,
      errorDetails: errorMessage,
      responsibleTenant: responsibleTenant?.name || null,
      notificationType: type,
      isTest: true,
      createdAt: new Date(),
    });
    return {
      status: "failed",
      error: errorMessage,
    };
  }
}
