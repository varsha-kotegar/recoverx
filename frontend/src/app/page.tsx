"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import {
  Cpu,
  HardDrive,
  Activity,
  Server,
  Archive,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  FileCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { api } from "@/lib/api";
import { SystemSummary, MetricPoint, BackupItem, IncidentItem, RestoreItem } from "@/lib/types";
import { formatBytes, formatUptime, formatDate, truncateHash } from "@/lib/utils";
import Link from "next/link";

export default function OverviewPage() {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [recentBackups, setRecentBackups] = useState<BackupItem[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<IncidentItem[]>([]);
  const [recentRestores, setRecentRestores] = useState<RestoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [sumRes, histRes, bkRes, incRes, rstRes] = await Promise.all([
        api.getSystemSummary(),
        api.getMetricsHistory(30),
        api.listBackups(),
        api.listIncidents(),
        api.listRestores(),
      ]);
      setSummary(sumRes);
      setHistory(histRes);
      setRecentBackups(bkRes.backups.slice(0, 4));
      setRecentIncidents(incRes.incidents.slice(0, 4));
      setRecentRestores(rstRes.restores.slice(0, 4));
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setApiConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Format chart time labels
  const formattedChartData = history.map((pt) => {
    const d = new Date(pt.timestamp);
    return {
      ...pt,
      timeLabel: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    };
  });

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="Infrastructure Overview"
        subtitle="Real-time telemetry, automated backups, and incident observability."
        isRefreshing={refreshing}
        onRefresh={fetchData}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* System Health Banner */}
        {summary && (
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-sm ${
              summary.system_status === "healthy"
                ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                : summary.system_status === "warning"
                ? "bg-amber-950/20 border-amber-800/40 text-amber-300"
                : "bg-rose-950/30 border-rose-800/50 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {summary.system_status === "healthy" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              ) : summary.system_status === "warning" ? (
                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold capitalize text-base">
                    System State: {summary.system_status}
                  </span>
                  <Badge
                    variant={
                      summary.system_status === "healthy"
                        ? "success"
                        : summary.system_status === "warning"
                        ? "warning"
                        : "danger"
                    }
                    size="sm"
                  >
                    {summary.hostname} ({summary.platform})
                  </Badge>
                </div>
                <div className="text-xs opacity-90 mt-1 space-y-0.5">
                  {summary.status_reasons.map((r, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
                      <span>•</span> {r}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Link
                href="/incidents"
                className="px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-xs font-medium text-slate-200 transition-colors"
              >
                Inspect Incidents ({summary.open_incidents_count})
              </Link>
            </div>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Card */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm hover:border-surface-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">CPU Utilization</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {summary ? `${summary.cpu_percent.toFixed(1)}%` : "--"}
              </span>
              <span className="text-xs text-slate-400">
                ({summary?.cpu_count_logical || 0} logical cores)
              </span>
            </div>
            <div className="w-full bg-surface-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (summary?.cpu_percent || 0) > 85
                    ? "bg-rose-500"
                    : (summary?.cpu_percent || 0) > 70
                    ? "bg-amber-500"
                    : "bg-cyan-500"
                }`}
                style={{ width: `${Math.min(100, summary?.cpu_percent || 0)}%` }}
              />
            </div>
          </div>

          {/* Memory Card */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm hover:border-surface-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">RAM / Memory</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {summary ? `${summary.memory_percent.toFixed(1)}%` : "--"}
              </span>
              <span className="text-xs text-slate-400">
                ({summary ? (summary.memory_used_mb / 1024).toFixed(1) : 0} /{" "}
                {summary ? (summary.memory_total_mb / 1024).toFixed(1) : 0} GB)
              </span>
            </div>
            <div className="w-full bg-surface-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (summary?.memory_percent || 0) > 85
                    ? "bg-rose-500"
                    : (summary?.memory_percent || 0) > 75
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, summary?.memory_percent || 0)}%` }}
              />
            </div>
          </div>

          {/* Disk Card */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm hover:border-surface-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Disk Storage</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {summary ? `${summary.disk_percent.toFixed(1)}%` : "--"}
              </span>
              <span className="text-xs text-slate-400">
                ({summary?.disk_used_gb || 0} / {summary?.disk_total_gb || 0} GB)
              </span>
            </div>
            <div className="w-full bg-surface-200 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (summary?.disk_percent || 0) > 90
                    ? "bg-rose-500"
                    : (summary?.disk_percent || 0) > 80
                    ? "bg-amber-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min(100, summary?.disk_percent || 0)}%` }}
              />
            </div>
          </div>

          {/* Backup Snapshot Card */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm hover:border-surface-border/80 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Backups</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Archive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {summary?.total_backups || 0}
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                <FileCheck className="w-3.5 h-3.5" /> SHA-256 Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 truncate">
              Last: {summary?.last_successful_backup ? formatDate(summary.last_successful_backup) : "No backups yet"}
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU & Memory Chart */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  CPU & Memory Utilization History
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Live time-series readings from hardware</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> CPU %
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> RAM %
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {formattedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2B42" opacity={0.6} />
                    <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#121A2A",
                        borderColor: "#1F2B42",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Area type="monotone" dataKey="cpu_percent" name="CPU %" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                    <Area type="monotone" dataKey="memory_percent" name="Memory %" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#memGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Collecting metric telemetry...
                </div>
              )}
            </div>
          </div>

          {/* Network IO Chart */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  Network Throughput & Processes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Interface bandwidth counters (MB)</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> Sent (MB)
                </span>
                <span className="flex items-center gap-1.5 text-brand-amber font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Recv (MB)
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              {formattedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2B42" opacity={0.6} />
                    <XAxis dataKey="timeLabel" stroke="#64748B" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#121A2A",
                        borderColor: "#1F2B42",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line type="monotone" dataKey="network_sent_mb" name="Sent MB" stroke="#6366F1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="network_recv_mb" name="Recv MB" stroke="#F59E0B" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Collecting network telemetry...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Feeds (Backups, Incidents, Restores) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Backups */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Archive className="w-4 h-4 text-cyan-400" /> Recent Backups
                </h3>
                <Link href="/backups" className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5">
                  View All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentBackups.length > 0 ? (
                  recentBackups.map((bkp) => (
                    <div
                      key={bkp.id}
                      className="p-3 rounded-lg bg-surface-200/60 border border-surface-border hover:border-surface-border/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 truncate max-w-[150px]">
                          {bkp.label}
                        </span>
                        <Badge
                          variant={
                            bkp.verification_status === "VERIFIED"
                              ? "success"
                              : bkp.verification_status === "CORRUPTED"
                              ? "danger"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {bkp.verification_status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                        <span>{formatBytes(bkp.archive_size_bytes)} ({bkp.file_count} files)</span>
                        <span>{formatDate(bkp.created_at)}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                        SHA-256: {truncateHash(bkp.sha256_checksum, 6, 6)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No backups created yet. Click "Create Backup" to begin.
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/backups"
              className="mt-4 block text-center py-2 rounded-lg bg-surface-200 hover:bg-surface-hover border border-surface-border text-xs text-slate-300 font-medium transition-colors"
            >
              + Create New Backup
            </Link>
          </div>

          {/* Active Incidents */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Active Incidents
                </h3>
                <Link href="/incidents" className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5">
                  View All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentIncidents.length > 0 ? (
                  recentIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3 rounded-lg bg-surface-200/60 border border-surface-border hover:border-surface-border/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 truncate max-w-[160px]">
                          {inc.title}
                        </span>
                        <Badge
                          variant={
                            inc.severity === "critical"
                              ? "danger"
                              : inc.severity === "warning"
                              ? "warning"
                              : "info"
                          }
                          size="sm"
                        >
                          {inc.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {inc.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                        <span className="capitalize">Category: {inc.category}</span>
                        <span>{formatDate(inc.last_observed_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500 flex flex-col items-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <span>No active incidents detected.</span>
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/incidents"
              className="mt-4 block text-center py-2 rounded-lg bg-surface-200 hover:bg-surface-hover border border-surface-border text-xs text-slate-300 font-medium transition-colors"
            >
              Manage & Simulate Incidents
            </Link>
          </div>

          {/* Recent Restores */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400" /> Recent Restores
                </h3>
                <Link href="/restore-center" className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5">
                  View All <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5">
                {recentRestores.length > 0 ? (
                  recentRestores.map((rst) => (
                    <div
                      key={rst.id}
                      className="p-3 rounded-lg bg-surface-200/60 border border-surface-border hover:border-surface-border/80 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-200 truncate">
                          {rst.id}
                        </span>
                        <Badge
                          variant={rst.status === "SUCCESS" ? "success" : "danger"}
                          size="sm"
                        >
                          {rst.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        To: {rst.destination_path}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                        <span>{formatBytes(rst.bytes_restored)} ({rst.file_count} files)</span>
                        <span>{formatDate(rst.created_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No restore operations executed yet.
                  </div>
                )}
              </div>
            </div>

            <Link
              href="/restore-center"
              className="mt-4 block text-center py-2 rounded-lg bg-surface-200 hover:bg-surface-hover border border-surface-border text-xs text-slate-300 font-medium transition-colors"
            >
              Open Restore Center
            </Link>
          </div>
        </div>

        {/* System Specs Footer Summary */}
        {summary && (
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-slate-500">OS:</span> {summary.os_name} ({summary.architecture})
              </div>
              <div>
                <span className="text-slate-500">Uptime:</span> {formatUptime(summary.uptime_seconds)}
              </div>
              <div>
                <span className="text-slate-500">Processes:</span> {summary.process_count} active
              </div>
              <div>
                <span className="text-slate-500">Python:</span> {summary.python_version}
              </div>
            </div>
            <div className="text-slate-500">
              RecoverX Local Engine v1.0.0
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
