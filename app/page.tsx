"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import AdminGuard from "@/components/AdminGuard";
import NotificationLog from "@/components/NotificationLog";
import { Notification } from "@/lib/models/Notification";
import { Schedule } from "@/lib/models/Schedule";
import { getWeekNumber, getBinTypesForWeek } from "@/lib/schedule-utils";

export default function Dashboard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [upcomingBins, setUpcomingBins] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testType, setTestType] = useState<"put-out" | "bring-in">("put-out");
  const [testWeekOffset, setTestWeekOffset] = useState(0);
  
  // Chat ID configuration
  const [liveChatId, setLiveChatId] = useState("");
  const [testChatId, setTestChatId] = useState("");
  const [savingChatIds, setSavingChatIds] = useState(false);
  const [chatIdSaveResult, setChatIdSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notificationsRes, scheduleRes] = await Promise.all([
        fetch("/api/notifications?limit=10"),
        fetch("/api/schedule"),
      ]);

      const notificationsData = await notificationsRes.json();
      const scheduleData = await scheduleRes.json();

      setNotifications(notificationsData);
      setSchedule(scheduleData);
      
      // Set chat IDs from schedule
      setLiveChatId(scheduleData?.groupChatId || "");
      setTestChatId(scheduleData?.testChatId || "");

      // Calculate upcoming bins
      const weekNumber = getWeekNumber(new Date());
      const isOddWeek = weekNumber % 2 === 1;
      const binTypes = getBinTypesForWeek(isOddWeek);
      setUpcomingBins(binTypes);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChatIds = async () => {
    if (!schedule) return;
    
    setSavingChatIds(true);
    setChatIdSaveResult(null);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...schedule,
          groupChatId: liveChatId,
          testChatId: testChatId,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setSchedule(updated);
        setChatIdSaveResult({ success: true, message: "Chat IDs saved successfully!" });
        setTimeout(() => setChatIdSaveResult(null), 3000);
      } else {
        setChatIdSaveResult({ success: false, message: "Failed to save chat IDs" });
      }
    } catch (error) {
      console.error("Error saving chat IDs:", error);
      setChatIdSaveResult({ success: false, message: "Error saving chat IDs" });
    } finally {
      setSavingChatIds(false);
    }
  };

  const handleTestNotification = async () => {
    const typeLabel = testType === "put-out" ? "Put bins out" : "Bring bins in";
    const weekLabel = testWeekOffset === 0 ? "next collection" : `+${testWeekOffset} week${testWeekOffset > 1 ? "s" : ""}`;
    if (!confirm(`Send a test "${typeLabel}" notification for ${weekLabel}?\n\nThis will send a WhatsApp message to your test recipient.`)) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: testType, weekOffset: testWeekOffset }),
      });
      const result = await response.json();
      setTestResult(result);
      if (result.success) {
        fetchData(); // Refresh notifications
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  };

  const binTypeNames: Record<string, string> = {
    general_waste: "General Waste",
    paper_card: "Paper/Card",
    glass_cans_plastics: "Glass/Cans/Plastics",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navigation />
        <AdminGuard>
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-slate-300">Loading...</div>
          </div>
        </AdminGuard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <AdminGuard>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
          <p className="text-slate-200">Overview of bin collection schedule and notifications</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/80 p-6 rounded-xl shadow-lg border border-slate-600/50">
            <h3 className="text-lg font-semibold mb-4 text-white">Upcoming Collection</h3>
            <p className="text-slate-300 mb-2">
              <strong className="text-slate-200">Day:</strong> Tuesday (tomorrow)
            </p>
            <p className="text-slate-300 mb-2">
              <strong className="text-slate-200">Bin Types:</strong>
            </p>
            <ul className="list-disc list-inside text-slate-300 mb-4">
              {upcomingBins.length > 0 ? (
                upcomingBins.map((bin) => (
                  <li key={bin}>{binTypeNames[bin] || bin}</li>
                ))
              ) : (
                <li>No collections this week</li>
              )}
            </ul>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Message type</label>
                <select
                  value={testType}
                  onChange={(e) => setTestType(e.target.value as "put-out" | "bring-in")}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100"
                >
                  <option value="put-out">Put bins out</option>
                  <option value="bring-in">Bring bins in</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Simulate collection</label>
                <select
                  value={testWeekOffset}
                  onChange={(e) => setTestWeekOffset(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100"
                >
                  <option value={0}>Next collection (matches Schedule page)</option>
                  <option value={1}>Collection after next (+1 week)</option>
                  <option value={2}>+2 weeks</option>
                  <option value={3}>+3 weeks</option>
                  <option value={4}>+4 weeks</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">Tests that collection&apos;s bin types and responsible person</p>
              </div>
              <button
                onClick={handleTestNotification}
                disabled={testing}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? "Sending Test..." : "Send Test Notification"}
              </button>
            </div>
            {testResult && (
              <div className={`mt-4 p-3 rounded-md ${testResult.success ? "bg-green-900/30 border border-green-600" : "bg-red-900/30 border border-red-600"}`}>
                <p className={`text-sm font-semibold ${testResult.success ? "text-green-300" : "text-red-300"}`}>
                  {testResult.success ? "✓ Test Sent Successfully" : "✗ Test Failed"}
                </p>
                {testResult.success && (
                  <div className="mt-2 text-xs text-slate-300 space-y-1">
                    {testResult.targetDate && (
                      <p><span className="text-slate-400">Target date:</span> {new Date(testResult.targetDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}</p>
                    )}
                    {testResult.binTypes && (
                      <p><span className="text-slate-400">Bins:</span> {testResult.binTypes.map((b: string) => binTypeNames[b] || b).join(", ")}</p>
                    )}
                    {testResult.responsibleTenant && (
                      <p><span className="text-slate-400">Responsible:</span> <span className="text-emerald-400 font-medium">{testResult.responsibleTenant}</span></p>
                    )}
                    <p><span className="text-slate-400">Type:</span> {testResult.type === "bring-in" ? "Bring bins in" : "Put bins out"}</p>
                  </div>
                )}
                {testResult.error && (
                  <p className="text-xs text-red-300 mt-1">{testResult.error}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-800/80 p-6 rounded-xl shadow-lg border border-slate-600/50">
            <h3 className="text-lg font-semibold mb-4 text-white">Schedule Settings</h3>
            <p className="text-slate-300 mb-2">
              <strong className="text-slate-200">Collection Day:</strong> {schedule?.collectionDay || "Tuesday"}
            </p>
            <p className="text-slate-300 mb-2">
              <strong className="text-slate-200">Notification Time:</strong> {schedule?.notificationTime || "17:00"}
            </p>
            <p className="text-slate-300">
              <strong className="text-slate-200">Rotation:</strong>{" "}
              {schedule?.rotationEnabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>

        {/* Chat ID Configuration */}
        <div className="bg-slate-800/80 p-6 rounded-xl shadow-lg border border-slate-600/50 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            WhatsApp Recipients
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Configure where notifications are sent. Use group chat IDs (ending in @g.us) or personal chat IDs (phone@c.us).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Live Notifications
                <span className="ml-2 px-2 py-0.5 bg-blue-900/50 text-blue-300 text-xs rounded-full">Production</span>
              </label>
              <input
                type="text"
                value={liveChatId}
                onChange={(e) => setLiveChatId(e.target.value)}
                placeholder="e.g., 123456789@g.us"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-slate-500">Scheduled notifications go here</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Test Notifications
                <span className="ml-2 px-2 py-0.5 bg-amber-900/50 text-amber-300 text-xs rounded-full">Testing</span>
              </label>
              <input
                type="text"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="e.g., 447123456789@c.us or group@g.us"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-slate-500">Test button sends here (can be personal)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveChatIds}
              disabled={savingChatIds}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {savingChatIds ? "Saving..." : "Save Recipients"}
            </button>
            {chatIdSaveResult && (
              <span className={`text-sm ${chatIdSaveResult.success ? "text-green-400" : "text-red-400"}`}>
                {chatIdSaveResult.message}
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-800/80 p-6 rounded-xl shadow-lg border border-slate-600/50">
          <h3 className="text-lg font-semibold mb-4 text-white">Recent Notifications</h3>
          <NotificationLog 
            notifications={notifications} 
            onDelete={(id) => setNotifications(notifications.filter(n => n._id !== id))}
          />
        </div>
      </div>
      </AdminGuard>
    </div>
  );
}
