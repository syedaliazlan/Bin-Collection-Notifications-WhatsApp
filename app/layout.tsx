import type { Metadata, Viewport } from "next";
import "./globals.css";

// In-process scheduler is DISABLED by default.
// External cron (e.g. cron-job.org calling /api/cron) is the primary mechanism.
// Running both causes duplicate notifications and rotation drift.
// Set ENABLE_SCHEDULER=true ONLY if you have NO external cron configured.
if (process.env.ENABLE_SCHEDULER === "true" && typeof window === "undefined") {
  import("@/lib/init-scheduler").catch(console.error);
}

export const metadata: Metadata = {
  title: "Bin Collection Reminder",
  description: "Automated WhatsApp reminders for bin collection",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-900 text-gray-100">{children}</body>
    </html>
  );
}
