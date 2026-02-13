import { NextResponse } from "next/server";
import { startScheduler } from "@/lib/scheduler";

// This endpoint can be called to start the scheduler
// In production, you might want to call this on app startup
export async function POST() {
  try {
    startScheduler();
    return NextResponse.json({
      success: true,
      message: "Scheduler started",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
