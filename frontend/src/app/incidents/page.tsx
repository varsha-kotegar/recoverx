"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import { Modal } from "@/components/UI/Modal";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  CheckCircle,
  HelpCircle,
  Clock,
  Terminal,
  FileText,
  Play,
  Filter,
  Check,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { IncidentItem, IncidentListResult } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function IncidentsPage() {
  const [incidentsData, setIncidentsData] = useState<IncidentListResult>({
    total: 0,
    open_count: 0,
    acknowledged_count: 0,
    resolved_count: 0,
    incidents: [],
  });
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  // Simulation Modal
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simType, setSimType] = useState("cpu_spike");
  const [simSeverity, setSimSeverity] = useState("warning");
  const [isSimulating, setIsSimulating] = useState(false);

  // Resolve Modal
  const [resolveTarget, setResolveTarget] = useState<IncidentItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async () => {
    try {
      setRefreshing(true);
      const s = statusFilter === "ALL" ? undefined : statusFilter;
      const c = categoryFilter === "ALL" ? undefined : categoryFilter;
      const res = await api.listIncidents(s, c);
      setIncidentsData(res);
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setApiConnected(false);
    } finally {
      setRefreshing(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 6000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.acknowledgeIncident(id);
      fetchIncidents();
    } catch (err: any) {
      alert(`Failed to acknowledge incident: ${err.message}`);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget || !resolutionNotes.trim()) {
      setResolveError("Please provide resolution notes.");
      return;
    }
    setIsResolving(true);
    setResolveError(null);
    try {
      await api.resolveIncident(resolveTarget.id, resolutionNotes.trim());
      setResolveTarget(null);
      setResolutionNotes("");
      fetchIncidents();
    } catch (err: any) {
      setResolveError(err.message || "Failed to resolve incident.");
    } finally {
      setIsResolving(false);
    }
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      await api.simulateIncident(simType, simSeverity);
      setIsSimulateOpen(false);
      fetchIncidents();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="Incident Management & Alert Triage"
        subtitle="Real-time incident detection, threshold alerts, runbook SOPs, and resolution tracking."
        isRefreshing={refreshing}
        onRefresh={fetchIncidents}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Status KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Total Incidents</span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                {incidentsData.total}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-800 text-slate-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Open Unresolved</span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {incidentsData.open_count}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Acknowledged</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {incidentsData.acknowledged_count}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface-card border border-surface-border shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Resolved</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {incidentsData.resolved_count}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar & Simulation Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Tabs */}
            <div className="p-1 rounded-lg bg-surface-card border border-surface-border flex items-center gap-1 text-xs">
              {["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    statusFilter === tab
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Categories</option>
              <option value="cpu">CPU Alerts</option>
              <option value="memory">Memory Alerts</option>
              <option value="disk">Storage Alerts</option>
              <option value="backup">Backup Failures</option>
              <option value="integrity">Integrity Violations</option>
              <option value="restore">Restore Failures</option>
              <option value="system">System / Service</option>
            </select>
          </div>

          {/* Simulate Demo Incident */}
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-950/30"
          >
            <Zap className="w-4 h-4" />
            <span>Simulate Incident (Demo)</span>
          </button>
        </div>

        {/* Incident List Cards */}
        <div className="space-y-4">
          {incidentsData.incidents.length > 0 ? (
            incidentsData.incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-xl bg-surface-card border border-surface-border shadow-sm space-y-4 transition-all hover:border-surface-border/80"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Badge
                      variant={
                        inc.severity === "critical"
                          ? "danger"
                          : inc.severity === "warning"
                          ? "warning"
                          : "info"
                      }
                      size="md"
                      dot={inc.status !== "RESOLVED"}
                    >
                      {inc.severity.toUpperCase()}
                    </Badge>
                    <h3 className="font-semibold text-sm text-slate-100">{inc.title}</h3>
                    <span className="font-mono text-xs text-slate-500">({inc.id})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm" className="capitalize font-mono">
                      Category: {inc.category}
                    </Badge>
                    <Badge
                      variant={
                        inc.status === "OPEN"
                          ? "danger"
                          : inc.status === "ACKNOWLEDGED"
                          ? "warning"
                          : "success"
                      }
                      size="sm"
                    >
                      {inc.status}
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">{inc.description}</p>

                {/* Evidence Box */}
                {inc.evidence && (
                  <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border text-xs">
                    <span className="font-semibold text-slate-400 block mb-1">Measured Telemetry Evidence:</span>
                    <pre className="font-mono text-[11px] text-cyan-300 whitespace-pre-wrap">{inc.evidence}</pre>
                  </div>
                )}

                {/* Troubleshooting SOP Runbook */}
                {inc.troubleshooting_steps && (
                  <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/40 text-xs">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1.5 mb-1">
                      <Terminal className="w-3.5 h-3.5" /> Actionable Troubleshooting SOP:
                    </span>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{inc.troubleshooting_steps}</p>
                  </div>
                )}

                {/* Resolution Notes if Resolved */}
                {inc.status === "RESOLVED" && inc.resolution_notes && (
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
                    <span className="font-semibold block mb-0.5">Resolution Notes (Resolved {formatDate(inc.resolved_at)}):</span>
                    <p className="text-slate-300">{inc.resolution_notes}</p>
                  </div>
                )}

                {/* Footer Timestamps & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                  <div className="flex items-center gap-4 text-[11px]">
                    <span>First Detected: {formatDate(inc.first_detected_at)}</span>
                    <span>Last Observed: {formatDate(inc.last_observed_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {inc.status === "OPEN" && (
                      <button
                        onClick={() => handleAcknowledge(inc.id)}
                        className="px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-hover border border-surface-border text-amber-400 hover:text-amber-300 font-medium text-xs transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}

                    {inc.status !== "RESOLVED" && (
                      <button
                        onClick={() => setResolveTarget(inc)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/40 text-emerald-300 font-medium text-xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve Incident</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 rounded-xl bg-surface-card border border-surface-border text-center text-slate-500 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Incidents Found</h4>
              <p className="text-xs">All monitored systems are functioning normally.</p>
            </div>
          )}
        </div>
      </div>

      {/* RESOLVE INCIDENT MODAL */}
      <Modal
        isOpen={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title="Resolve Incident"
        description={`Incident ID: ${resolveTarget?.id} — ${resolveTarget?.title}`}
      >
        <form onSubmit={handleResolveSubmit} className="space-y-4">
          {resolveError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {resolveError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Resolution Notes & Action Taken <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detail root-cause analysis, remediations applied, or config updates made..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setResolveTarget(null)}
              className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isResolving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              {isResolving ? "Resolving..." : "Confirm Resolution"}
            </button>
          </div>
        </form>
      </Modal>

      {/* SIMULATE INCIDENT MODAL */}
      <Modal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        title="Simulate Operational Incident (Educational Demo)"
        description="Trigger simulated failure states to demonstrate incident deduplication, triage, and runbooks."
      >
        <form onSubmit={handleSimulateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Incident Scenario Preset
            </label>
            <select
              value={simType}
              onChange={(e) => setSimType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="cpu_spike">CPU Saturation Spike (98.4%)</option>
              <option value="memory_exhaustion">Memory Exhaustion / OOM Threat</option>
              <option value="disk_full">Disk Storage Depletion (99.1%)</option>
              <option value="backup_corruption">SHA-256 Bit-Rot Backup Corruption</option>
              <option value="service_failure">Collector Daemon Service Termination</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alert Severity Level
            </label>
            <select
              value={simSeverity}
              onChange={(e) => setSimSeverity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="informational">Informational</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSimulateOpen(false)}
              className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSimulating}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isSimulating ? "Injecting Event..." : "Trigger Simulation"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
