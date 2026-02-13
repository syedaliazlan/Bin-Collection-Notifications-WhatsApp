"use client";

import { Tenant } from "@/lib/models/Tenant";
import { useState, useRef } from "react";

interface TenantListProps {
  tenants: Tenant[];
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onReorder?: (newOrder: string[]) => void;
}

export default function TenantList({
  tenants,
  onDelete,
  onToggleActive,
  onReorder,
}: TenantListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant?")) {
      return;
    }
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Add a slight delay to show the drag state
    setTimeout(() => {
      (e.target as HTMLElement).classList.add("opacity-50");
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    setDraggedId(null);
    setDragOverId(null);
    dragCounter.current = 0;
    (e.target as HTMLElement).classList.remove("opacity-50");
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    e.preventDefault();
    dragCounter.current++;
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain");
    
    if (sourceId === targetId || !onReorder) {
      setDragOverId(null);
      return;
    }

    // Calculate new order
    const currentOrder = tenants.map(t => t._id!);
    const sourceIndex = currentOrder.indexOf(sourceId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDragOverId(null);
      return;
    }

    // Remove source and insert at target position
    const newOrder = [...currentOrder];
    newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, sourceId);

    onReorder(newOrder);
    setDragOverId(null);
  };

  return (
    <div className="overflow-x-auto">
      {onReorder && tenants.length > 1 && (
        <div className="px-6 py-3 bg-slate-700/50 border-b border-slate-600/50">
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Drag and drop rows to reorder the rotation sequence
          </p>
        </div>
      )}
      <table className="min-w-full bg-slate-800/80 border border-slate-600/50">
        <thead className="bg-slate-700/80 border-b border-slate-600/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-16">
              #
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-slate-800/80 divide-y divide-slate-600/50">
          {tenants.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center">
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-slate-200 font-medium">No tenants found</p>
                  <p className="text-sm text-slate-400 mt-1">Add your first tenant below</p>
                </div>
              </td>
            </tr>
          ) : (
            tenants.map((tenant, index) => (
              <tr
                key={tenant._id}
                draggable={!!onReorder}
                onDragStart={(e) => handleDragStart(e, tenant._id!)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, tenant._id!)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tenant._id!)}
                className={`transition-all ${
                  onReorder ? "cursor-grab active:cursor-grabbing" : ""
                } ${
                  dragOverId === tenant._id
                    ? "bg-teal-900/40 border-t-2 border-teal-500"
                    : "hover:bg-slate-700/40"
                } ${
                  draggedId === tenant._id ? "opacity-50" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {onReorder && (
                      <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    )}
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-600/70 text-slate-100 font-semibold text-sm border border-slate-500/40">
                      {index + 1}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-white">{tenant.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() =>
                      onToggleActive(tenant._id!, !tenant.active)
                    }
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      tenant.active
                        ? "bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50 border border-emerald-600/60"
                        : "bg-slate-700/60 text-slate-400 hover:bg-slate-600/60 border border-slate-600"
                    }`}
                  >
                    {tenant.active ? "✓ Active" : "○ Inactive"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDelete(tenant._id!)}
                    disabled={deletingId === tenant._id}
                    className="px-4 py-2 bg-red-900/50 text-red-300 hover:bg-red-800/50 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-700"
                  >
                    {deletingId === tenant._id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
