"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setAuthenticated(true);
        setPassword("");
      } else {
        setError("Invalid password");
      }
    } catch (error) {
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "DELETE" });
      setAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        {/* Nav is rendered by the page (Dashboard/Tenants) above AdminGuard */}
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-600/50">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-600/60 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Admin Access Required</h2>
              <p className="text-slate-300">Please enter the admin password to view this page</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Enter admin password"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-500 transition-all shadow-md"
              >
                Login
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => router.push("/")}
                className="text-sm text-slate-300 hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-amber-900/30 border-l-4 border-amber-500 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-amber-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-amber-200 font-medium">Admin Mode</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-amber-200 hover:text-white font-medium"
          >
            Logout
          </button>
        </div>
      </div>
      {children}
    </>
  );
}
