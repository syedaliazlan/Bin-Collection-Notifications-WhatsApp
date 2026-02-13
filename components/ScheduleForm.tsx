"use client";

import { Schedule, BinType } from "@/lib/models/Schedule";
import { useState } from "react";

interface ScheduleFormProps {
  schedule: Schedule | null;
  onSave: (schedule: Partial<Schedule>) => void;
}

export default function ScheduleForm({ schedule, onSave }: ScheduleFormProps) {
  const [formData, setFormData] = useState({
    collectionDay: schedule?.collectionDay || "Tuesday",
    binTypes: schedule?.binTypes || [
      "general_waste",
      "paper_card",
      "glass_cans_plastics",
    ],
    weekPattern: schedule?.weekPattern || "all",
    notificationTime: schedule?.notificationTime || "17:00",
    bringInTime: schedule?.bringInTime || "17:00",
    groupChatId: schedule?.groupChatId || "",
    rotationEnabled: schedule?.rotationEnabled ?? true,
  });

  const binTypeOptions: { value: BinType; label: string }[] = [
    { value: "general_waste", label: "General Waste" },
    { value: "paper_card", label: "Paper/Card" },
    { value: "glass_cans_plastics", label: "Glass/Cans/Plastics" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleBinType = (binType: BinType) => {
    setFormData((prev) => ({
      ...prev,
      binTypes: prev.binTypes.includes(binType)
        ? prev.binTypes.filter((bt) => bt !== binType)
        : [...prev.binTypes, binType],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Collection Day
        </label>
        <select
          value={formData.collectionDay}
          onChange={(e) =>
            setFormData({ ...formData, collectionDay: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Bin Types
        </label>
        <div className="space-y-2">
          {binTypeOptions.map((option) => (
            <label key={option.value} className="flex items-center text-slate-200">
              <input
                type="checkbox"
                checked={formData.binTypes.includes(option.value)}
                onChange={() => toggleBinType(option.value)}
                className="mr-2 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Week Pattern
        </label>
        <select
          value={formData.weekPattern}
          onChange={(e) =>
            setFormData({
              ...formData,
              weekPattern: e.target.value as "odd" | "even" | "all",
            })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          <option value="all">All Weeks</option>
          <option value="odd">Odd Weeks (Paper/Card + Glass/Cans/Plastics)</option>
          <option value="even">Even Weeks (General Waste)</option>
        </select>
        <p className="mt-1 text-sm text-slate-400">
          Based on Preston calendar: Odd weeks = Paper/Card + Glass/Cans/Plastics, Even weeks = General Waste
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Put Bins Out - Notification Time
        </label>
        <input
          type="time"
          value={formData.notificationTime}
          onChange={(e) =>
            setFormData({ ...formData, notificationTime: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-slate-400">
          Time to send reminder to put bins out (day before collection)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Bring Bins In - Notification Time
        </label>
        <input
          type="time"
          value={formData.bringInTime}
          onChange={(e) =>
            setFormData({ ...formData, bringInTime: e.target.value })
          }
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-slate-400">
          Time to send reminder to bring bins back in (on collection day)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          WhatsApp Group Chat ID
        </label>
        <input
          type="text"
          value={formData.groupChatId}
          onChange={(e) =>
            setFormData({ ...formData, groupChatId: e.target.value })
          }
          placeholder="123456789@g.us"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-slate-400">
          WhatsApp group chat ID where all notifications will be sent (format: 123456789@g.us)
        </p>
      </div>

      <div>
        <label className="flex items-center text-slate-200">
          <input
            type="checkbox"
            checked={formData.rotationEnabled}
            onChange={(e) =>
              setFormData({ ...formData, rotationEnabled: e.target.checked })
            }
            className="mr-2 rounded border-slate-500 bg-slate-700 text-teal-500 focus:ring-teal-500"
          />
          <span className="text-sm font-medium">
            Enable Rotation
          </span>
        </label>
        <p className="mt-1 text-sm text-slate-400">
          If enabled, one person is named as responsible each week and it cycles through the list (e.g. with 3 tenants: week 1 → first, week 2 → second, week 3 → third, week 4 → first again). The reminder is always sent to the group; rotation only changes who is designated in the message and on the schedule. If disabled, no single person is designated as responsible.
        </p>
      </div>

      <button
        type="submit"
        className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-800"
      >
        Save Schedule
      </button>
    </form>
  );
}
