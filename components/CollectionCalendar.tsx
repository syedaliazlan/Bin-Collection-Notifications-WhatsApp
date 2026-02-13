"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Schedule } from "@/lib/models/Schedule";
import { Tenant } from "@/lib/models/Tenant";
import { getWeekNumber, getBinTypesForWeek } from "@/lib/schedule-utils";
import { binTypeImagePaths, binTypeNames as binNames } from "@/lib/bin-icons";

interface CollectionCalendarProps {
  schedule: Schedule | null;
  tenants: Tenant[];
  currentRotationIndex: number;
}

interface CollectionDate {
  date: Date;
  dayName: string;
  binTypeKeys: string[];
  responsiblePerson: string | null;
  weekNumber: number;
}

export default function CollectionCalendar({ schedule, tenants, currentRotationIndex }: CollectionCalendarProps) {
  const [upcomingCollections, setUpcomingCollections] = useState<CollectionDate[]>([]);

  useEffect(() => {
    if (!schedule) return;

    const collections: CollectionDate[] = [];
    const today = new Date();
    // Include tenants that are active (treat missing/undefined active as true for backwards compatibility)
    const activeTenants = tenants
      .filter((t) => t.active !== false)
      .sort((a, b) => (a.rotationOrder ?? 0) - (b.rotationOrder ?? 0));

    // Collections after the "Next Collection" (skip weekOffset 0 so we don't duplicate the hero card)
    for (let weekOffset = 1; weekOffset <= 8; weekOffset++) {
      // Find next Tuesday
      const targetDate = new Date(today);
      const daysUntilTuesday = (2 - targetDate.getDay() + 7) % 7 || 7;
      targetDate.setDate(today.getDate() + daysUntilTuesday + (weekOffset * 7));

      // Calculate week number and bin types
      const weekNumber = getWeekNumber(targetDate);
      const isOddWeek = weekNumber % 2 === 1;
      const binTypes = getBinTypesForWeek(isOddWeek);

      if (binTypes.length === 0) continue;

      // Determine responsible person based on rotation (treat missing rotationEnabled as true)
      // Use the actual current rotation index from the database + weekOffset
      // This ensures the calendar stays in sync with the hero card and test notifications
      let responsiblePerson: string | null = null;
      if (activeTenants.length > 0) {
        if (schedule.rotationEnabled !== false) {
          // currentRotationIndex is the person shown in the hero (weekOffset=0)
          // So for weekOffset=1, we add 1 to get the next person in rotation
          const rotationIndex = (currentRotationIndex + weekOffset) % activeTenants.length;
          responsiblePerson = activeTenants[rotationIndex]?.name || null;
        } else {
          responsiblePerson = activeTenants[0].name;
        }
      }

      collections.push({
        date: targetDate,
        dayName: targetDate.toLocaleDateString("en-GB", { weekday: "long" }),
        binTypeKeys: binTypes,
        responsiblePerson,
        weekNumber,
      });
    }

    setUpcomingCollections(collections);
  }, [schedule, tenants, currentRotationIndex]);

  if (!schedule) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  return (
    <div className="bg-slate-800/80 rounded-xl shadow-lg border border-slate-600/50 p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Upcoming Collections</h3>

      {upcomingCollections.length === 0 ? (
        <p className="text-slate-400 text-center py-6 sm:py-8 text-sm sm:text-base">No upcoming collections scheduled</p>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {upcomingCollections.map((collection, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 sm:p-4 transition-all ${
                isToday(collection.date)
                  ? "border-teal-500/60 bg-teal-900/30"
                  : isPast(collection.date)
                  ? "border-slate-600/50 bg-slate-800/40 opacity-70"
                  : "border-slate-600/50 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div
                      className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-white text-sm sm:text-base ${
                        isToday(collection.date)
                          ? "bg-teal-600"
                          : isPast(collection.date)
                          ? "bg-slate-500"
                          : "bg-slate-600"
                      }`}
                    >
                      {collection.date.getDate()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm sm:text-base truncate">
                        {collection.dayName}, {formatDate(collection.date)}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-300">
                        {collection.responsiblePerson ? (
                          <span className="font-medium text-emerald-400">Responsible: {collection.responsiblePerson}</span>
                        ) : (
                          <>Week {collection.weekNumber} ({collection.weekNumber % 2 === 1 ? "Odd" : "Even"})</>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-2 items-center">
                    {collection.binTypeKeys.map((key) => {
                      const src = binTypeImagePaths[key];
                      const name = binNames[key] || key;
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-600/70 text-slate-100 rounded-full text-xs sm:text-sm font-medium border border-slate-500/40"
                        >
                          {src ? (
                            <Image
                              src={src}
                              alt={name}
                              width={40}
                              height={40}
                              className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
                              unoptimized
                            />
                          ) : null}
                          <span>{name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {isToday(collection.date) && (
                  <div className="sm:mt-0 pt-2 sm:pt-0 border-t border-teal-600/40 sm:border-t-0 sm:border-l sm:border-l-teal-600/40 sm:pl-3 flex sm:block">
                    <span className="inline-flex items-center px-2 py-1 bg-teal-600 text-white text-xs font-semibold rounded">
                      Today
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
