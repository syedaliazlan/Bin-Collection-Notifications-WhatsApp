import cron from "node-cron";
import { getDatabase } from "./db";
import { sendWhatsAppMessage } from "./greenapi";
import { Tenant } from "./models/Tenant";
import { Schedule, BinType } from "./models/Schedule";
import { Notification } from "./models/Notification";
import { RotationState } from "./models/RotationState";
import { getWeekNumber, getBinTypesForWeek } from "./schedule-utils";
import { createNotificationMessage } from "./message-templates";

let cronJob: cron.ScheduledTask | null = null;

let bringInCronJob: cron.ScheduledTask | null = null;

export function startScheduler() {
  if (cronJob || bringInCronJob) {
    console.log("Scheduler already running");
    return;
  }

  // Run every Monday at notification time (default 5:00 PM) - Put bins out
  cronJob = cron.schedule("0 17 * * 1", async () => {
    console.log("Running scheduled notification check (put bins out)...");
    try {
      await checkAndSendNotifications("put-out");
    } catch (error) {
      console.error("Error in scheduled notification check:", error);
    }
  });

  // Run every Tuesday at bring-in time (default 5:00 PM) - Bring bins back in
  bringInCronJob = cron.schedule("0 17 * * 2", async () => {
    console.log("Running scheduled notification check (bring bins in)...");
    try {
      await checkAndSendNotifications("bring-in");
    } catch (error) {
      console.error("Error in scheduled bring-in notification check:", error);
    }
  });

  console.log("Scheduler started - will run every Monday at 5:00 PM (put out) and Tuesday at 5:00 PM (bring in)");
}

export function stopScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
  }
  if (bringInCronJob) {
    bringInCronJob.stop();
    bringInCronJob = null;
  }
  console.log("Scheduler stopped");
}

export type CheckAndSendResult = { sent: boolean; reason?: string };

/**
 * Get the target collection date (the Tuesday this notification is about).
 * - For "put-out" (sent on Monday): the next day (Tuesday)
 * - For "bring-in" (sent on Tuesday): today (Tuesday)
 * This is used for deduplication to ensure we only send one notification per collection date per type.
 */
function getCollectionDate(type: "put-out" | "bring-in"): string {
  const now = new Date();
  const collectionDate = new Date(now);

  if (type === "put-out") {
    // Put-out is sent on Monday; collection is tomorrow (Tuesday)
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    if (dayOfWeek === 1) {
      // Monday → Tuesday is +1
      collectionDate.setDate(now.getDate() + 1);
    } else {
      // If called on a different day (e.g. manual test), find the next Tuesday
      const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
      collectionDate.setDate(now.getDate() + daysUntilTuesday);
    }
  } else {
    // Bring-in is sent on Tuesday; collection is today
    // If called on a different day, find the most recent Tuesday or next Tuesday
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 2) {
      // Already Tuesday, use today
    } else {
      // Find next Tuesday
      const daysUntilTuesday = (2 - dayOfWeek + 7) % 7 || 7;
      collectionDate.setDate(now.getDate() + daysUntilTuesday);
    }
  }

  return collectionDate.toISOString().split("T")[0]; // YYYY-MM-DD
}

export async function checkAndSendNotifications(type: "put-out" | "bring-in" = "put-out"): Promise<CheckAndSendResult> {
  const db = await getDatabase();
  const tenantsCollection = db.collection<Tenant>("tenants");
  const schedulesCollection = db.collection<Schedule>("schedules");
  const notificationsCollection = db.collection<Notification>("notifications");
  const rotationCollection = db.collection<RotationState>("rotation_states");

  // ═══════════════════════════════════════════════════════════════════
  // DEDUPLICATION: Check if we already sent this type for this collection date
  // This prevents duplicate sends when both in-process cron and external cron fire
  // ═══════════════════════════════════════════════════════════════════
  const collectionDate = getCollectionDate(type);
  const existingNotification = await notificationsCollection.findOne({
    isTest: { $ne: true },
    notificationType: type,
    collectionDate: collectionDate,
    status: "success",
  });

  if (existingNotification) {
    const reason = `Notification already sent for ${type} on collection date ${collectionDate} (sent at ${existingNotification.sentAt}). Skipping duplicate.`;
    console.log(`[DEDUP] ${reason}`);
    return { sent: false, reason };
  }

  // Also check for very recent sends (within last 10 minutes) as a fallback
  // for older notifications that don't have collectionDate field yet
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentDuplicate = await notificationsCollection.findOne({
    isTest: { $ne: true },
    status: "success",
    sentAt: { $gte: tenMinutesAgo },
    // Match on message content containing the type-specific keywords
    message: type === "put-out" 
      ? { $regex: "put.*out|take out the bins", $options: "i" }
      : { $regex: "bring in", $options: "i" },
  });

  if (recentDuplicate) {
    const reason = `A similar ${type} notification was sent very recently (at ${recentDuplicate.sentAt}). Skipping to avoid duplicate.`;
    console.log(`[DEDUP-FALLBACK] ${reason}`);
    return { sent: false, reason };
  }

  // Get active schedule
  const schedule = await schedulesCollection.findOne({});
  if (!schedule) {
    const reason = "No schedule configured";
    console.log(reason);
    return { sent: false, reason };
  }

  // For bring-in notifications, we need to determine which bins were put out
  let binTypes: BinType[] = [];
  
  if (type === "bring-in") {
    // Get the most recent successful put-out notifications to determine which bins to bring in
    const recentNotifications = await notificationsCollection
      .find({
        status: "success",
        isTest: { $ne: true },
        sentAt: { $gte: new Date(Date.now() - 26 * 60 * 60 * 1000) }
      })
      .sort({ sentAt: -1 })
      .toArray();
    
    const binTypesSet = new Set<BinType>();
    recentNotifications.forEach((notif: any) => {
      if (notif.binTypes && Array.isArray(notif.binTypes)) {
        notif.binTypes.forEach((bt: BinType) => binTypesSet.add(bt));
      }
    });
    binTypes = Array.from(binTypesSet);
    
    // If no recent notifications, use current week's bins as fallback
    if (binTypes.length === 0) {
      const weekNumber = getWeekNumber(new Date());
      const isOddWeek = weekNumber % 2 === 1;
      binTypes = getBinTypesForWeek(isOddWeek);
    }
  } else {
    // For put-out, calculate based on the COLLECTION date (next Tuesday), not today
    const collectionDateObj = new Date(collectionDate + "T12:00:00");
    const weekNumber = getWeekNumber(collectionDateObj);
    const isOddWeek = weekNumber % 2 === 1;
    binTypes = getBinTypesForWeek(isOddWeek);
  }

  if (binTypes.length === 0) {
    const reason = `No bins to ${type === "bring-in" ? "bring in" : "put out"} for this week`;
    console.log(reason);
    return { sent: false, reason };
  }

  // Get group chat ID from schedule or environment
  const groupChatId = schedule.groupChatId || process.env.GREEN_API_GROUP_CHAT_ID;

  if (!groupChatId) {
    const reason = "No group chat ID configured. Set groupChatId in schedule or GREEN_API_GROUP_CHAT_ID in environment.";
    console.error(reason);
    return { sent: false, reason };
  }

  // Get active tenants for rotation tracking
  const tenants = await tenantsCollection
    .find({ active: true })
    .sort({ rotationOrder: 1 })
    .toArray();

  // Determine which tenant is responsible
  let responsibleTenant: Tenant | null = null;
  
  if (type === "bring-in") {
    // ═══════════════════════════════════════════════════════════════════
    // BRING-IN: The same person who put the bins out must bring them in.
    // Look up who was responsible from the most recent put-out notification
    // for this collection date. Do NOT use the rotation index because it
    // was already advanced after the put-out was sent.
    // ═══════════════════════════════════════════════════════════════════
    const putOutNotification = await notificationsCollection.findOne({
      isTest: { $ne: true },
      notificationType: "put-out",
      collectionDate: collectionDate,
      status: "success",
    });

    if (putOutNotification && putOutNotification.responsibleTenant) {
      // Find the tenant object by name so the message template works correctly
      const matchedTenant = tenants.find(
        (t) => t.name === putOutNotification.responsibleTenant
      );
      if (matchedTenant) {
        responsibleTenant = matchedTenant;
        console.log(`[ROTATION] Bring-in: using same person as put-out → ${responsibleTenant.name}`);
      } else {
        // Tenant name from put-out doesn't match any active tenant (maybe renamed/deleted)
        // Create a minimal tenant-like object so the name still appears in the message
        responsibleTenant = { name: putOutNotification.responsibleTenant } as Tenant;
        console.log(`[ROTATION] Bring-in: tenant "${putOutNotification.responsibleTenant}" from put-out not found in active list, using name directly`);
      }
    } else {
      // Fallback: no matching put-out found (e.g. old data without collectionDate).
      // Search for the most recent put-out within 26 hours.
      const recentPutOut = await notificationsCollection.findOne(
        {
          isTest: { $ne: true },
          status: "success",
          notificationType: "put-out",
          sentAt: { $gte: new Date(Date.now() - 26 * 60 * 60 * 1000) },
        },
        { sort: { sentAt: -1 } }
      );

      if (recentPutOut && recentPutOut.responsibleTenant) {
        const matchedTenant = tenants.find(
          (t) => t.name === recentPutOut.responsibleTenant
        );
        responsibleTenant = matchedTenant || ({ name: recentPutOut.responsibleTenant } as Tenant);
        console.log(`[ROTATION] Bring-in fallback: using recent put-out person → ${responsibleTenant.name}`);
      } else {
        // Last resort: use current rotation index
        console.log(`[ROTATION] Bring-in: no put-out notification found, falling back to rotation index`);
        if (schedule.rotationEnabled && tenants.length > 0) {
          const rotationState = await rotationCollection.findOne({ binType: "global" });
          const idx = rotationState?.currentTenantIndex ?? 0;
          // The index was already advanced, so go back one to get the person who should have put out
          const putOutIdx = (idx - 1 + tenants.length) % tenants.length;
          responsibleTenant = tenants[putOutIdx] || tenants[0];
          console.log(`[ROTATION] Bring-in last-resort: rotation index ${idx}, rewound to ${putOutIdx} → ${responsibleTenant.name}`);
        } else if (tenants.length > 0) {
          responsibleTenant = tenants[0];
        }
      }
    }
  } else {
    // ═══════════════════════════════════════════════════════════════════
    // PUT-OUT: Use rotation index and advance it for next week
    // ═══════════════════════════════════════════════════════════════════
    if (schedule.rotationEnabled && tenants.length > 0) {
      const rotationKey = "global";
      let rotationState = await rotationCollection.findOne({ binType: rotationKey });

      if (!rotationState) {
        // Initialize global rotation state
        const existingStates = await rotationCollection
          .find({ binType: { $ne: "global" } })
          .sort({ lastUpdated: -1 })
          .limit(1)
          .toArray();
        
        const initialIndex = existingStates.length > 0 
          ? existingStates[0].currentTenantIndex 
          : 0;
        
        await rotationCollection.insertOne({
          binType: rotationKey,
          currentTenantIndex: initialIndex,
          lastUpdated: new Date(),
        });
        rotationState = await rotationCollection.findOne({ binType: rotationKey });
        console.log(`Initialized global rotation state with index ${initialIndex}`);
      }

      if (rotationState) {
        responsibleTenant = tenants[rotationState.currentTenantIndex] || tenants[0];
        
        console.log(`[ROTATION] Put-out: Current index: ${rotationState.currentTenantIndex}, Tenant: ${responsibleTenant?.name}`);
        
        // Advance rotation for next week
        const nextIndex = (rotationState.currentTenantIndex + 1) % tenants.length;
        await rotationCollection.updateOne(
          { binType: rotationKey },
          {
            $set: {
              currentTenantIndex: nextIndex,
              lastUpdated: new Date(),
            },
          }
        );
        console.log(`[ROTATION] Advanced rotation to index ${nextIndex} (${tenants[nextIndex]?.name}) for next week`);
      } else {
        responsibleTenant = tenants[0];
      }
    } else if (tenants.length > 0) {
      responsibleTenant = tenants[0];
    }
  }

  // Send notification to the group
  const sent = await sendNotificationToGroup(
    groupChatId,
    binTypes,
    notificationsCollection,
    type,
    responsibleTenant,
    collectionDate
  );
  return { sent };
}

async function sendNotificationToGroup(
  groupChatId: string,
  binTypes: BinType[],
  notificationsCollection: any,
  type: "put-out" | "bring-in" = "put-out",
  responsibleTenant: Tenant | null = null,
  collectionDate: string = ""
): Promise<boolean> {
  const message = createNotificationMessage(binTypes, type, responsibleTenant, { isTest: false });

  try {
    await sendWhatsAppMessage(groupChatId, message);
    await notificationsCollection.insertOne({
      sentAt: new Date(),
      recipient: groupChatId,
      recipientName: "Group Chat",
      binTypes,
      status: "success",
      message,
      responsibleTenant: responsibleTenant?.name || null,
      notificationType: type,
      collectionDate: collectionDate,
      isTest: false,
      createdAt: new Date(),
    });
    console.log(`Notification sent successfully to group ${groupChatId} (type: ${type}, collection: ${collectionDate})`);
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await notificationsCollection.insertOne({
      sentAt: new Date(),
      recipient: groupChatId,
      recipientName: "Group Chat",
      binTypes,
      status: "failed",
      message,
      errorDetails: errorMessage,
      responsibleTenant: responsibleTenant?.name || null,
      notificationType: type,
      collectionDate: collectionDate,
      isTest: false,
      createdAt: new Date(),
    });
    console.error(`Failed to send notification to group ${groupChatId}:`, errorMessage);
    return false;
  }
}
