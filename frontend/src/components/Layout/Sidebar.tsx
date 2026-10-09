"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Server,
  Archive,
  RotateCcw,
  AlertTriangle,
  FileText,
  Settings as SettingsIcon,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  openIncidentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  openIncidentsCount = 0,
}) => {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: Activity },
    { name: "System Health", href: "/system-health", icon: Server },
    { name: "Backups", href: "/backups", icon: Archive },
    { name: "Restore Center", href: "/restore-center", icon: RotateCcw },
    {
      name: "Incidents",
      href: "/incidents",
      icon: AlertTriangle,
      badge: openIncidentsCount > 0 ? openIncidentsCount : undefined,
    },
    { name: "Diagnostic Logs", href: "/diagnostic-logs", icon: FileText },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 bg-surface-sidebar border-r border-surface-border transition-all duration-300 flex flex-col justify-between select-none",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-surface-border/80 justify-between">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-950/50 flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold tracking-wider text-slate-100 text-base">
                  Recover<span className="text-cyan-400">X</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-semibold">
                  CORE INFRA
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-surface-hover transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface-hover/70"
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-colors",
                    isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}

                {/* Optional Alert Badge */}
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30",
                      collapsed ? "absolute -top-1 -right-1" : "ml-auto"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Educational Disclaimer Banner */}
      <div className="p-3 border-t border-surface-border/80">
        {!collapsed ? (
          <div className="p-2.5 rounded-lg bg-surface-200/50 border border-surface-border text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>Educational Sandbox</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              RecoverX is designed for learning SRE & disaster recovery workflows.
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="RecoverX Prototype Mode">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
        )}
      </div>
    </aside>
  );
};
