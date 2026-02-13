"use client";

import { useState } from "react";
import { Notification } from "@/lib/models/Notification";

interface NotificationLogProps {
  notifications: Notification[];
  onDelete?: (id: string) => void;
}

export default function NotificationLog({ notifications, onDelete }: NotificationLogProps) {
  const [viewingMessage, setViewingMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const binTypeNames: Record<string, string> = {
    general_waste: "General Waste",
    paper_card: "Paper/Card",
    glass_cans_plastics: "Glass/Cans/Plastics",
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;
    
    setDeletingId(id);
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      
      if (response.ok) {
        onDelete?.(id);
      } else {
        alert("Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("Error deleting notification");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Message View Modal */}
      {viewingMessage && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600 max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-white">Message Sent</h3>
              <button
                onClick={() => setViewingMessage(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm text-slate-200 font-mono bg-slate-900/50 p-4 rounded-lg">
                {viewingMessage}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-600">
              <button
                onClick={() => setViewingMessage(null)}
                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-slate-800/80 border border-slate-600/50">
          <thead className="bg-slate-700/80 border-b border-slate-600/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                Sent At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                Responsible
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                Bin Types
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">
                Error
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-200 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-800/80 divide-y divide-slate-600/50">
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-slate-300">
                  No notifications sent yet.
                </td>
              </tr>
            ) : (
              notifications.map((notification) => (
                <tr key={notification._id} className="hover:bg-slate-700/40">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                    {new Date(notification.sentAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                    {notification.responsibleTenant || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200">
                    {notification.binTypes
                      .map((type) => binTypeNames[type] || type)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold text-center ${
                          notification.isTest
                            ? "bg-amber-900/50 text-amber-300"
                            : "bg-blue-900/50 text-blue-300"
                        }`}
                      >
                        {notification.isTest ? "Test" : "Live"}
                      </span>
                      {(notification as any).notificationType && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium text-center ${
                            (notification as any).notificationType === "put-out"
                              ? "bg-purple-900/50 text-purple-300"
                              : "bg-cyan-900/50 text-cyan-300"
                          }`}
                        >
                          {(notification as any).notificationType === "put-out" ? "Put Out" : "Bring In"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        notification.status === "success"
                          ? "bg-emerald-900/50 text-emerald-300"
                          : "bg-red-900/50 text-red-300"
                      }`}
                    >
                      {notification.status === "success" ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300 max-w-[150px] truncate" title={notification.errorDetails || ""}>
                    {notification.errorDetails || "-"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Button */}
                      <button
                        onClick={() => setViewingMessage(notification.message)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded transition-colors"
                        title="View message"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(notification._id!)}
                        disabled={deletingId === notification._id}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
                        title="Delete notification"
                      >
                        {deletingId === notification._id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
