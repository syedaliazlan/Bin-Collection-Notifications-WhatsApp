"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/tenants", label: "Tenants" },
    { href: "/schedule", label: "Schedule" },
  ];

  return (
    <nav className="bg-slate-800 text-white shadow-lg border-b border-slate-700/50 overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 max-w-full">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 bg-slate-600/60 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h1 className="text-base sm:text-xl font-bold truncate">Bin Collection Reminder</h1>
          </div>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1 sm:space-x-6 flex-shrink-0">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    pathname === item.href
                      ? "bg-slate-600/80 text-white font-semibold"
                      : "text-slate-200 hover:bg-slate-700/60 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden flex-shrink-0 p-2 rounded-lg text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu panel */}
        {mobileOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-600/50">
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg transition-all ${
                      pathname === item.href
                        ? "bg-slate-600/80 text-white font-semibold"
                        : "text-slate-200 hover:bg-slate-700/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
