import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { Schedule } from "@/lib/models/Schedule";

export async function GET() {
  try {
    const db = await getDatabase();
    const schedule = await db.collection<Schedule>("schedules").findOne({});

    if (!schedule) {
      // Return default schedule if none exists
      return NextResponse.json({
        collectionDay: "Monday",
        binTypes: ["general_waste", "paper_card", "glass_cans_plastics"],
        weekPattern: "all",
        notificationTime: "17:00",
        bringInTime: "17:00",
        groupChatId: process.env.GREEN_API_GROUP_CHAT_ID || "",
        testChatId: process.env.GREEN_API_TEST_CHAT_ID || "",
        rotationEnabled: true,
      });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { collectionDay, binTypes, weekPattern, notificationTime, bringInTime, groupChatId, testChatId, rotationEnabled } = body;

    const db = await getDatabase();
    
    // Check if schedule exists
    const existing = await db.collection<Schedule>("schedules").findOne({});
    
    const schedule: Schedule = {
      collectionDay: collectionDay || "Monday",
      binTypes: binTypes || ["general_waste", "paper_card", "glass_cans_plastics"],
      weekPattern: weekPattern || "all",
      notificationTime: notificationTime || "17:00",
      bringInTime: bringInTime || "17:00",
      groupChatId: groupChatId || process.env.GREEN_API_GROUP_CHAT_ID || "",
      testChatId: testChatId || process.env.GREEN_API_TEST_CHAT_ID || "",
      rotationEnabled: rotationEnabled ?? true,
      updatedAt: new Date(),
    };

    if (existing) {
      // Update existing schedule
      const result = await db
        .collection<Schedule>("schedules")
        .findOneAndUpdate(
          { _id: existing._id },
          { $set: schedule },
          { returnDocument: "after" }
        );
      return NextResponse.json(result);
    } else {
      // Create new schedule
      schedule.createdAt = new Date();
      const result = await db.collection<Schedule>("schedules").insertOne(schedule);
      return NextResponse.json(
        { ...schedule, _id: result.insertedId.toString() },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error saving schedule:", error);
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    );
  }
}
