"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import { Modal } from "@/components/UI/Modal";
import {
  FileText,
  ShieldCheck,
  Search,
  Filter,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  HardDrive,
  Cpu,
  Layers,
  Terminal,
} from "lucide-react";
import { api } from "@/lib/api";
import { LogEntryItem, DiagnosticReport } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function DiagnosticLogsPage() {
  const [logs, setLogs] = useState<LogEntryItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [componentFilter, setComponentFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  // Diagnostic Run State
  const [diagReport, setDiagReport] = useState<DiagnosticReport | null>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);

  // Log detail inspection modal
  const [selectedLog, setSelectedLog] = useState<LogEntryItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.listLogs({
        search: search.trim() || undefined,
        severity: severityFilter === "ALL" ? undefined : severityFilter,
        component: componentFilter === "ALL" ? undefined : componentFilter,
        page,
        page_size: pageSize,
      });
      setLogs(res.logs);
      setTotalLogs(res.total);
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setApiConnected(false);
    } finally {
      setRefreshing(false);
    }
  }, [search, severityFilter, componentFilter, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const report = await api.runDiagnostics();
      setDiagReport(report);
      fetchLogs();
    } catch (err: any) {
      alert(`Diagnostics failed: ${err.message}`);
    } finally {
      setIsRunningDiag(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="Diagnostic Logs & System Health Suite"
        subtitle="Structured event streams, audit logs, and allowlisted health verification suite."
        isRefreshing={refreshing}
        onRefresh={fetchLogs}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-2xl flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search log messages or related IDs..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>

            {/* Component Filter */}
            <select
              value={componentFilter}
              onChange={(e) => {
                setComponentFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Components</option>
              <option value="system">system</option>
              <option value="backup">backup</option>
              <option value="integrity">integrity</option>
              <option value="restore">restore</option>
              <option value="incident">incident</option>
              <option value="diagnostic">diagnostic</option>
              <option value="settings">settings</option>
            </select>
          </div>

          {/* Run Diagnostic Button */}
          <button
            onClick={handleRunDiagnostics}
            disabled={isRunningDiag}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-950/40"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRunningDiag ? "Executing Diagnostics..." : "Run Diagnostic Suite"}</span>
          </button>
        </div>

        {/* Diagnostic Report Panel (if run) */}
        {diagReport && (
          <div className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Latest Diagnostic Suite Results
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    diagReport.overall_health === "HEALTHY"
                      ? "success"
                      : diagReport.overall_health === "DEGRADED"
                      ? "warning"
                      : "danger"
                  }
                  size="md"
                >
                  HEALTH: {diagReport.overall_health}
                </Badge>
                <span className="text-xs text-slate-400">
                  ({diagReport.passed_count} Passed, {diagReport.warn_count} Warn, {diagReport.failed_count} Fail)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagReport.results.map((r, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg bg-surface-200/60 border border-surface-border flex items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-200">{r.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">[{r.category}]</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{r.message}</p>
                    {r.suggested_action && (
                      <p className="text-[11px] text-cyan-400 font-mono mt-1">
                        Action: {r.suggested_action}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      r.status === "PASS"
                        ? "success"
                        : r.status === "WARN"
                        ? "warning"
                        : "danger"
                    }
                    size="sm"
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>

            {diagReport.recommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-surface-sidebar border border-surface-border text-xs text-slate-300">
                <span className="font-semibold text-cyan-400 block mb-1">Platform Recommendations:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                  {diagReport.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Logs Table */}
        <div className="rounded-xl bg-surface-card border border-surface-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">Structured Diagnostic Log Stream</h3>
            </div>
            <Badge variant="neutral" size="sm">{totalLogs} Entries</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sidebar/60 text-slate-400 uppercase tracking-wider border-b border-surface-border font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-24">Severity</th>
                  <th className="py-3 px-4 w-44">Timestamp</th>
                  <th className="py-3 px-4 w-32">Component</th>
                  <th className="py-3 px-4 w-36">Event Type</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4 w-28 text-right">Related ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-surface-hover/60 transition-colors cursor-pointer"
                    >
                      {/* Severity */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            log.severity === "CRITICAL"
                              ? "danger"
                              : log.severity === "ERROR"
                              ? "danger"
                              : log.severity === "WARNING"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {log.severity}
                        </Badge>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {formatDate(log.timestamp)}
                      </td>

                      {/* Component */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-300">
                        {log.component}
                      </td>

                      {/* Event Type */}
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {log.event_type}
                      </td>

                      {/* Message */}
                      <td className="py-3 px-4 font-mono text-slate-200 truncate max-w-md">
                        {log.message}
                      </td>

                      {/* Related ID */}
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-cyan-400 truncate">
                        {log.related_id || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-500">
                      No logs found matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LOG INSPECTION MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Log Entry #${selectedLog?.id || ""}`}
        description={`Timestamp: ${formatDate(selectedLog?.timestamp)}`}
      >
        {selectedLog && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <Badge
                variant={
                  selectedLog.severity === "ERROR" || selectedLog.severity === "CRITICAL"
                    ? "danger"
                    : selectedLog.severity === "WARNING"
                    ? "warning"
                    : "neutral"
                }
                size="md"
              >
                {selectedLog.severity}
              </Badge>
              <span className="text-slate-400">{selectedLog.component} / {selectedLog.event_type}</span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Message:</span>
              <div className="p-3 bg-surface-200 rounded border border-surface-border text-slate-200 whitespace-pre-wrap">
                {selectedLog.message}
              </div>
            </div>

            {selectedLog.related_id && (
              <div>
                <span className="text-slate-500">Related ID:</span>{" "}
                <span className="text-cyan-400">{selectedLog.related_id}</span>
              </div>
            )}

            {selectedLog.extra_metadata && (
              <div>
                <span className="text-slate-500 block mb-1">Extra Metadata:</span>
                <pre className="p-3 bg-surface-200 rounded border border-surface-border text-slate-300 text-[11px] overflow-x-auto">
                  {selectedLog.extra_metadata}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
