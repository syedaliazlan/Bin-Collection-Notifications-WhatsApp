import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Schedule } from "@/lib/models/Schedule";
import { Tenant } from "@/lib/models/Tenant";
import { RotationState } from "@/lib/models/RotationState";
import { getWeekNumber, getBinTypesForWeek } from "@/lib/schedule-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDatabase();
    const schedulesCollection = db.collection<Schedule>("schedules");
    const tenantsCollection = db.collection<Tenant>("tenants");
    const rotationCollection = db.collection<RotationState>("rotation_states");

    // Get schedule
    const schedule = await schedulesCollection.findOne({});
    if (!schedule) {
      return NextResponse.json({
        error: "No schedule configured",
      }, { status: 404 });
    }

    // Get next collection date first (always Tuesday). On collection day (Tuesday),
    // "next" means the following Tuesday so we don't show today's bins again.
    const today = new Date();
    const nextCollection = new Date(today);
    const daysUntilTuesday = (2 - nextCollection.getDay() + 7) % 7 || 7;
    nextCollection.setDate(today.getDate() + daysUntilTuesday);

    // Use the *next collection date's* week to determine bin types (not today's).
    // e.g. On Tuesday 3-Feb (even week = General), next collection is 10-Feb (odd week = Paper + Glass).
    const weekNumber = getWeekNumber(nextCollection);
    const isOddWeek = weekNumber % 2 === 1;
    const binTypes = getBinTypesForWeek(isOddWeek);

    // Get responsible tenant from GLOBAL rotation state (consistent across all weeks)
    let responsibleTenant: Tenant | null = null;
    const tenants = await tenantsCollection
      .find({ active: true })
      .sort({ rotationOrder: 1 })
      .toArray();

    let debugInfo: any = {
      rotationEnabled: schedule.rotationEnabled,
      tenantsCount: tenants.length,
      tenantNames: tenants.map((t, i) => `[${i}] ${t.name} (order: ${t.rotationOrder})`),
    };

    if (schedule.rotationEnabled && tenants.length > 0) {
      // Use global rotation key for consistent rotation across all weeks
      const rotationState = await rotationCollection.findOne({ binType: "global" });
      if (rotationState) {
        responsibleTenant = tenants[rotationState.currentTenantIndex] || tenants[0];
        debugInfo.currentIndexFromDB = rotationState.currentTenantIndex;
        debugInfo.selectedTenant = responsibleTenant?.name;
      } else {
        responsibleTenant = tenants[0];
        debugInfo.note = "No rotation state found, using first tenant";
      }
    } else if (tenants.length > 0) {
      responsibleTenant = tenants[0];
      debugInfo.note = "Rotation disabled, using first tenant";
    }
    
    console.log("[NEXT-COLLECTION] Rotation debug:", JSON.stringify(debugInfo, null, 2));

    const binTypeNames: Record<string, string> = {
      general_waste: "General Waste",
      paper_card: "Paper/Card",
      glass_cans_plastics: "Glass/Cans/Plastics",
    };

    return NextResponse.json({
      nextCollectionDate: nextCollection.toISOString().split('T')[0],
      nextCollectionDay: "Tuesday",
      daysUntilCollection: daysUntilTuesday,
      binTypes: binTypes.map(bt => ({
        type: bt,
        name: binTypeNames[bt] || bt
      })),
      responsibleTenant: responsibleTenant ? {
        name: responsibleTenant.name,
        rotationOrder: responsibleTenant.rotationOrder
      } : null,
      // Include current rotation index so calendar can calculate future weeks correctly
      currentRotationIndex: debugInfo.currentIndexFromDB ?? 0,
      rotationEnabled: schedule.rotationEnabled,
      notificationTime: schedule.notificationTime,
      bringInTime: schedule.bringInTime,
    });
  } catch (error) {
    console.error("Error fetching next collection:", error);
    return NextResponse.json(
      { error: "Failed to fetch next collection info" },
      { status: 500 }
    );
  }
}
