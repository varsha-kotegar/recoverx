"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import {
  Cpu,
  Server,
  HardDrive,
  Activity,
  Network,
  Clock,
  Terminal,
  Layers,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { SystemSummary, SystemDiskInfo, SystemNetworkInfo } from "@/lib/types";
import { formatBytes, formatUptime, formatDate } from "@/lib/utils";

export default function SystemHealthPage() {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [disks, setDisks] = useState<SystemDiskInfo[]>([]);
  const [network, setNetwork] = useState<SystemNetworkInfo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [sumRes, diskRes, netRes] = await Promise.all([
        api.getSystemSummary(),
        api.getDisks(),
        api.getNetwork(),
      ]);
      setSummary(sumRes);
      setDisks(diskRes);
      setNetwork(netRes);
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to fetch system health:", err);
      setApiConnected(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="System Health & Hardware Telemetry"
        subtitle="Detailed CPU, memory, partition storage, and network interface metrics."
        isRefreshing={refreshing}
        onRefresh={fetchData}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Core Hardware Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CPU Overview */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Processor (CPU)
                </span>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-100">
                  {summary ? `${summary.cpu_percent.toFixed(1)}%` : "--"}
                </span>
                <span className="text-xs text-slate-400">load</span>
              </div>

              <div className="w-full bg-surface-200 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary?.cpu_percent || 0)}%` }}
                />
              </div>

              <div className="mt-5 space-y-2 text-xs border-t border-surface-border pt-3">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Logical Cores:</span>
                  <span className="font-mono">{summary?.cpu_count_logical || 0}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Physical Cores:</span>
                  <span className="font-mono">{summary?.cpu_count_physical || 0}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Active Tasks:</span>
                  <span className="font-mono">{summary?.process_count || 0} processes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Memory Overview */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  System RAM
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-100">
                  {summary ? `${summary.memory_percent.toFixed(1)}%` : "--"}
                </span>
                <span className="text-xs text-slate-400">utilized</span>
              </div>

              <div className="w-full bg-surface-200 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary?.memory_percent || 0)}%` }}
                />
              </div>

              <div className="mt-5 space-y-2 text-xs border-t border-surface-border pt-3">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Used Memory:</span>
                  <span className="font-mono">
                    {summary ? (summary.memory_used_mb / 1024).toFixed(2) : 0} GB
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Total Installed:</span>
                  <span className="font-mono">
                    {summary ? (summary.memory_total_mb / 1024).toFixed(2) : 0} GB
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Available Free:</span>
                  <span className="font-mono">
                    {summary ? ((summary.memory_total_mb - summary.memory_used_mb) / 1024).toFixed(2) : 0} GB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* OS Platform & Host Info */}
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Host Environment
                </span>
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Server className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-100 truncate">
                  {summary?.hostname || "Localhost"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {summary?.os_name}
              </p>

              <div className="mt-5 space-y-2 text-xs border-t border-surface-border pt-3">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Platform:</span>
                  <span>{summary?.platform} ({summary?.architecture})</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">System Uptime:</span>
                  <span className="font-mono">{summary ? formatUptime(summary.uptime_seconds) : "--"}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Boot Time:</span>
                  <span>{summary ? formatDate(summary.boot_time) : "--"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disk Partitions & Filesystem Storage */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Mounted Filesystems & Disks
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Partition capacity and utilization</p>
            </div>
            <Badge variant="neutral" size="sm">{disks.length} Mounts</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sidebar/50 text-slate-400 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Mountpoint</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Used / Total</th>
                  <th className="py-3 px-4">Free Space</th>
                  <th className="py-3 px-4 w-44">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {disks.length > 0 ? (
                  disks.map((d, i) => (
                    <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-200">{d.device || "-"}</td>
                      <td className="py-3.5 px-4 text-slate-200">{d.mountpoint}</td>
                      <td className="py-3.5 px-4 uppercase text-slate-400">{d.fstype || "auto"}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        {d.used_gb} GB / {d.total_gb} GB
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-medium">
                        {d.free_gb} GB free
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-surface-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                d.percent > 90
                                  ? "bg-rose-500"
                                  : d.percent > 80
                                  ? "bg-amber-500"
                                  : "bg-cyan-500"
                              }`}
                              style={{ width: `${d.percent}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-300 w-10 text-right">{d.percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      No disk partitions detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Network Interfaces */}
        <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-400" />
                Network Interfaces & Traffic Counters
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">NIC status, throughput, and packet counters</p>
            </div>
            <Badge variant="neutral" size="sm">{network.length} Interfaces</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sidebar/50 text-slate-400 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Interface</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total Sent</th>
                  <th className="py-3 px-4">Total Received</th>
                  <th className="py-3 px-4">Packets Sent</th>
                  <th className="py-3 px-4">Packets Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {network.length > 0 ? (
                  network.map((n, i) => (
                    <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        {n.interface}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={n.is_up ? "success" : "neutral"} size="sm" dot>
                          {n.is_up ? "UP" : "DOWN"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        {n.bytes_sent_mb} MB
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        {n.bytes_recv_mb} MB
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {n.packets_sent.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {n.packets_recv.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      No network interfaces detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
