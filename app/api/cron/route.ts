import { NextRequest, NextResponse } from "next/server";
import { checkAndSendNotifications } from "@/lib/scheduler";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = request.nextUrl.searchParams.get("secret");
  const typeParam = request.nextUrl.searchParams.get("type") as "put-out" | "bring-in" | null;
  const cronSecret = process.env.CRON_SECRET;

  // Check authentication
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 500 }
    );
  }

  const providedSecret = authHeader?.replace("Bearer ", "") || secret;
  if (providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Auto-detect notification type from day of week if not explicitly provided.
    // Sunday (day 0) → put-out, Monday (day 1) → bring-in.
    // This prevents misconfigured external cron from sending the wrong type.
    let notificationType: "put-out" | "bring-in";

    if (typeParam === "put-out" || typeParam === "bring-in") {
      notificationType = typeParam;
    } else {
      // No type provided — infer from current day of week
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, ...
      if (dayOfWeek === 1) {
        notificationType = "bring-in";
      } else {
        notificationType = "put-out";
      }
      console.log(`[CRON] No type parameter provided, auto-detected '${notificationType}' for day ${dayOfWeek}`);
    }

    const result = await checkAndSendNotifications(notificationType);
    return NextResponse.json({
      success: result.sent,
      sent: result.sent,
      reason: result.reason,
      message: result.sent
        ? `Notifications sent (${notificationType})`
        : (result.reason || `No notification sent (${notificationType})`),
      type: notificationType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        sent: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
