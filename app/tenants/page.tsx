"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import TenantList from "@/components/TenantList";
import AdminGuard from "@/components/AdminGuard";
import { Tenant } from "@/lib/models/Tenant";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    active: true,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/tenants");
      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: "", active: true });
        setShowForm(false);
        fetchTenants();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create tenant");
      }
    } catch (error) {
      console.error("Error creating tenant:", error);
      alert("Error creating tenant");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tenants/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTenants();
      } else {
        alert("Failed to delete tenant");
      }
    } catch (error) {
      console.error("Error deleting tenant:", error);
      alert("Error deleting tenant");
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await fetch(`/api/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      if (response.ok) {
        fetchTenants();
      } else {
        alert("Failed to update tenant");
      }
    } catch (error) {
      console.error("Error updating tenant:", error);
      alert("Error updating tenant");
    }
  };

  const handleReorder = async (newOrder: string[]) => {
    // Optimistically update the UI
    const reorderedTenants = newOrder.map((id, index) => {
      const tenant = tenants.find(t => t._id === id);
      return tenant ? { ...tenant, rotationOrder: index } : null;
    }).filter(Boolean) as Tenant[];
    
    setTenants(reorderedTenants);
    setReordering(true);

    try {
      const response = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: newOrder }),
      });

      if (!response.ok) {
        // Revert on failure
        fetchTenants();
        alert("Failed to update rotation order");
      }
    } catch (error) {
      console.error("Error updating rotation order:", error);
      // Revert on error
      fetchTenants();
      alert("Error updating rotation order");
    } finally {
      setReordering(false);
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

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />
      <AdminGuard>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Tenants</h2>
            <p className="text-slate-300">Manage tenant rotation list</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-500 transition-all shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showForm ? "Cancel" : "Add Tenant"}
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-800/80 p-8 rounded-xl shadow-lg border border-slate-600/50 mb-6">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-slate-600/60 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Add New Tenant</h3>
                <p className="text-sm text-slate-400 mt-1">Rotation order will be assigned automatically</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Tenant Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter tenant name"
                  className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-xs text-slate-400">
                  💡 The rotation order will be automatically set based on when they are added
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-500 transition-all shadow-md"
                >
                  Add Tenant
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border-2 border-slate-600 text-slate-200 rounded-lg font-semibold hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-slate-800/80 rounded-xl shadow-lg border border-slate-600/50 overflow-hidden">
          {reordering && (
            <div className="px-6 py-2 bg-teal-900/30 border-b border-teal-600/50 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-teal-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm text-teal-300">Saving new order...</span>
            </div>
          )}
          <TenantList
            tenants={tenants}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onReorder={handleReorder}
          />
        </div>
      </div>
      </AdminGuard>
    </div>
  );
}
