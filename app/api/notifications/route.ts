import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db";
import { Notification } from "@/lib/models/Notification";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const db = await getDatabase();
    const notifications = await db
      .collection<Notification>("notifications")
      .find({})
      .sort({ sentAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db
      .collection<Notification>("notifications")
      .deleteOne({ _id: new ObjectId(id) as any });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
