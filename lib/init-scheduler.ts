// Initialize in-process scheduler on app startup.
// IMPORTANT: This should only be enabled if you do NOT have external cron configured.
// Running both in-process cron AND external cron causes duplicate notifications
// and rotation drift (wrong person assigned). Use ENABLE_SCHEDULER=true only when needed.
import { startScheduler } from "./scheduler";

if (process.env.ENABLE_SCHEDULER === "true") {
  console.log("Initializing in-process scheduler (ENABLE_SCHEDULER=true)...");
  startScheduler();
} else {
  console.log("In-process scheduler is disabled. Using external cron (/api/cron) instead.");
}
