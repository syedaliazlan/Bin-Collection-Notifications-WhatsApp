"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Navigation from "@/components/Navigation";
import ScheduleForm from "@/components/ScheduleForm";
import AdminGuard from "@/components/AdminGuard";
import CollectionCalendar from "@/components/CollectionCalendar";
import { Schedule } from "@/lib/models/Schedule";
import { Tenant } from "@/lib/models/Tenant";
import { binTypeImagePaths } from "@/lib/bin-icons";

function EditButton({ showForm, setShowForm }: { showForm: boolean; setShowForm: (val: boolean) => void }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/check");
      if (response.ok) {
        setAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!authenticated) return null;

  return (
    <button
      onClick={() => setShowForm(!showForm)}
      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 font-medium transition-colors"
    >
      {showForm ? "Cancel" : "Edit Schedule"}
    </button>
  );
}

interface NextCollection {
  nextCollectionDate: string;
  nextCollectionDay: string;
  daysUntilCollection: number;
  binTypes: Array<{ type: string; name: string }>;
  responsibleTenant: { name: string; rotationOrder: number } | null;
  currentRotationIndex: number;
  rotationEnabled: boolean;
  notificationTime: string;
  bringInTime: string;
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [nextCollection, setNextCollection] = useState<NextCollection | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [scheduleRes, nextCollectionRes, tenantsRes] = await Promise.all([
        fetch("/api/schedule"),
        fetch("/api/next-collection"),
        fetch("/api/tenants"),
      ]);
      
      const scheduleData = scheduleRes.ok ? await scheduleRes.json() : null;
      const nextCollectionData = nextCollectionRes.ok ? await nextCollectionRes.json() : null;
      const tenantsData = tenantsRes.ok ? await tenantsRes.json() : [];

      if (scheduleData?.error) console.error("Schedule error:", scheduleData.error);
      if (!nextCollectionRes.ok || nextCollectionData?.error) {
        setNextCollection(null);
      } else {
        setNextCollection(nextCollectionData);
      }

      setSchedule(scheduleData?.error ? null : scheduleData ?? {
        collectionDay: "Tuesday",
        binTypes: ["general_waste", "paper_card", "glass_cans_plastics"],
        weekPattern: "all",
        notificationTime: "17:00",
        bringInTime: "17:00",
        groupChatId: "",
        rotationEnabled: true,
      });
      setTenants(tenantsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSchedule({
        collectionDay: "Tuesday",
        binTypes: ["general_waste", "paper_card", "glass_cans_plastics"],
        weekPattern: "all",
        notificationTime: "17:00",
        bringInTime: "17:00",
        groupChatId: "",
        rotationEnabled: true,
      });
      setNextCollection(null);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (scheduleData: Partial<Schedule>) => {
    setSaving(true);
    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleData),
      });

      if (response.ok) {
        const updated = await response.json();
        setSchedule(updated);
        setShowForm(false);
        fetchData(); // Refresh next collection info
        alert("Schedule saved successfully!");
      } else {
        alert("Failed to save schedule");
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Error saving schedule");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-slate-300">Loading...</div>
        </div>
      </div>
    );
  }

  // Show error state if API calls failed and no data loaded
  if (!schedule && !nextCollection) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">
                  Unable to load schedule data
                </h3>
                <div className="mt-2 text-sm text-red-200">
                  <p>Please check that:</p>
                  <ul className="list-disc list-inside mt-2 text-slate-300">
                    <li>MONGODB_URI environment variable is set (Railway / Hostinger panel)</li>
                    <li>Database connection is working</li>
                    <li>API endpoints are accessible</li>
                  </ul>
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-6xl">
          <div className="mb-4 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Collection Schedule</h2>
            <p className="text-slate-200 text-sm sm:text-base">View upcoming collections and manage schedule settings</p>
          </div>

          {/* Next Collection Info - Always Visible */}
          {nextCollection && (
            <div className="bg-slate-700/80 rounded-xl sm:rounded-2xl shadow-xl border border-slate-600/50 p-4 sm:p-6 md:p-8 mb-4 sm:mb-8 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Next Collection</h3>
                  <p className="text-slate-200 text-sm sm:text-base">
                    {nextCollection.daysUntilCollection === 0
                      ? "Today"
                      : nextCollection.daysUntilCollection === 1
                      ? "Tomorrow"
                      : `In ${nextCollection.daysUntilCollection} days`}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-2xl sm:text-4xl font-bold">{nextCollection.nextCollectionDay}</div>
                  <div className="text-slate-300 text-xs sm:text-sm">
                    {new Date(nextCollection.nextCollectionDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-slate-600/40 rounded-lg p-3 sm:p-4 border border-slate-500/30">
                  <div className="text-xs sm:text-sm text-slate-300 mb-2">Bin Types</div>
                  <div className="flex flex-wrap gap-2">
                    {nextCollection.binTypes.map((bin) => {
                      const src = binTypeImagePaths[bin.type];
                      return (
                        <span
                          key={bin.type}
                          className="inline-flex items-center gap-1.5 bg-slate-600/60 text-slate-100 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border border-slate-500/40"
                        >
                          {src ? (
                            <Image
                              src={src}
                              alt={bin.name}
                              width={48}
                              height={48}
                              className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                              unoptimized
                            />
                          ) : null}
                          {bin.name}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {nextCollection.responsibleTenant && (
                  <div className="bg-slate-600/40 rounded-lg p-3 sm:p-4 border border-slate-500/30">
                    <div className="text-xs sm:text-sm text-slate-300 mb-1 sm:mb-2">Responsible Person</div>
                    <div className="text-lg sm:text-xl font-bold">
                      {nextCollection.responsibleTenant.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collection Calendar */}
          {schedule && (
            <div className="mb-4 sm:mb-8">
              <CollectionCalendar 
                schedule={schedule} 
                tenants={tenants} 
                currentRotationIndex={nextCollection?.currentRotationIndex ?? 0}
              />
            </div>
          )}

        {/* Schedule Configuration - Admin Only */}
          <div className="bg-slate-800/80 rounded-xl shadow-lg border border-slate-600/50 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">Schedule Configuration</h3>
              <EditButton showForm={showForm} setShowForm={setShowForm} />
            </div>

            {showForm ? (
              <AdminGuard>
                <ScheduleForm schedule={schedule} onSave={handleSave} />
                {saving && (
                  <div className="mt-4 text-center text-slate-400">Saving...</div>
                )}
              </AdminGuard>
            ) : (
              <div className="space-y-4 text-slate-300 text-sm sm:text-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-sm text-slate-400">Collection Day</div>
                    <div className="font-semibold text-white">
                      {schedule?.collectionDay || "Tuesday"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Rotation</div>
                    <div className="font-semibold text-white">
                      {schedule?.rotationEnabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-600/50">
                  <div className="text-sm text-slate-400 mb-2">Schedule Pattern</div>
                  <ul className="list-disc list-inside text-sm space-y-1 text-slate-300">
                    <li>
                      <strong className="text-slate-200">Odd weeks (1, 3, 5...):</strong> Paper/Card + Glass/Cans/Plastics
                    </li>
                    <li>
                      <strong className="text-slate-200">Even weeks (2, 4, 6...):</strong> General Waste only
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
