"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, Radio, PlusCircle, AlertOctagon } from "lucide-react";
import { Badge } from "@/components/UI/Badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  apiConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isRefreshing = false,
  onRefresh,
  apiConnected = true,
}) => {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setTimeStr(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-surface-border bg-surface-sidebar/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Page Title / Subtitle */}
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Environment Badge */}
        <Badge variant="cyan" size="sm" className="hidden sm:inline-flex">
          DEV / LOCALHOST
        </Badge>

        {/* API Health Status */}
        <Badge
          variant={apiConnected ? "success" : "danger"}
          size="sm"
          dot
          className="font-mono text-[11px]"
        >
          {apiConnected ? "API ONLINE" : "API OFFLINE"}
        </Badge>

        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-200 border border-surface-border text-xs font-mono text-slate-400">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>{timeStr || "00:00:00"}</span>
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-2 rounded-lg border border-surface-border bg-surface-card hover:bg-surface-hover text-slate-300 hover:text-slate-100 transition-all shadow-sm",
              isRefreshing && "opacity-75"
            )}
            title="Refresh live metrics and data"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-cyan-400")} />
          </button>
        )}

        {/* Quick Backup Action */}
        <Link
          href="/backups"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm shadow-cyan-900/30"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Create Backup</span>
        </Link>
      </div>
    </header>
  );
};
