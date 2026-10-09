"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import {
  Settings as SettingsIcon,
  Shield,
  Activity,
  HardDrive,
  Cpu,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FolderLock,
} from "lucide-react";
import { api } from "@/lib/api";
import { AppSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    cpu_warning_threshold: 75,
    cpu_critical_threshold: 90,
    memory_warning_threshold: 80,
    memory_critical_threshold: 95,
    disk_warning_threshold: 80,
    disk_critical_threshold: 90,
    polling_interval_seconds: 5,
    metrics_retention_hours: 48,
    demo_mode: true,
    allowed_roots: [],
    backup_storage_path: "",
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.getSettings();
      setSettings(res);
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setApiConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setFeedback({ type: "success", message: "Configuration persisted and applied successfully." });
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update settings." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      cpu_warning_threshold: 75,
      cpu_critical_threshold: 90,
      memory_warning_threshold: 80,
      memory_critical_threshold: 95,
      disk_warning_threshold: 80,
      disk_critical_threshold: 90,
      polling_interval_seconds: 5,
      metrics_retention_hours: 48,
      demo_mode: true,
    }));
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="Platform Settings & Thresholds"
        subtitle="Configure monitoring alert triggers, polling rates, security boundaries, and demo parameters."
        isRefreshing={refreshing}
        onRefresh={fetchSettings}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                : "bg-rose-950/30 border-rose-800 text-rose-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Monitoring Thresholds */}
          <div className="p-6 rounded-xl bg-surface-card border border-surface-border shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-surface-border pb-3">
              <Activity className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Telemetry Incident Thresholds</h3>
                <p className="text-xs text-slate-400">Set utilization triggers for warning and critical incident generation.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU */}
              <div className="p-4 rounded-lg bg-surface-200/60 border border-surface-border space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <Cpu className="w-4 h-4" /> CPU Thresholds (%)
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Warning Trigger (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={settings.cpu_warning_threshold}
                    onChange={(e) => setSettings({ ...settings, cpu_warning_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded bg-surface-card border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Critical Trigger (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.cpu_critical_threshold}
                    onChange={(e) => setSettings({ ...settings, cpu_critical_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded bg-surface-card border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Memory */}
              <div className="p-4 rounded-lg bg-surface-200/60 border border-surface-border space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Activity className="w-4 h-4" /> Memory Thresholds (%)
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Warning Trigger (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={settings.memory_warning_threshold}
                    onChange={(e) => setSettings({ ...settings, memory_warning_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded bg-surface-card border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Critical Trigger (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.memory_critical_threshold}
                    onChange={(e) => setSettings({ ...settings, memory_critical_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded bg-surface-card border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* Disk */}
              <div className="p-4 rounded-lg bg-surface-200/60 border border-surface-border space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                  <HardDrive className="w-4 h-4" /> Disk Thresholds (%)
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Warning Trigger (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={settings.disk_warning_threshold}
                    onChange={(e) => setSettings({ ...settings, disk_warning_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded bg-surface-card border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Critical Trigger (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.disk_critical_threshold}
                    onChange={(e) => setSettings({ ...settings, disk_critical_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded bg-surface-card border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Collector Engine & Retention */}
          <div className="p-6 rounded-xl bg-surface-card border border-surface-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-surface-border pb-3">
              <Clock className="w-5 h-5 text-brand-amber" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Telemetry Engine & Retention</h3>
                <p className="text-xs text-slate-400">Background polling interval and time-series SQLite retention.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Metrics Polling Interval (Seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={settings.polling_interval_seconds}
                  onChange={(e) => setSettings({ ...settings, polling_interval_seconds: parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  History Retention Window (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={settings.metrics_retention_hours}
                  onChange={(e) => setSettings({ ...settings, metrics_retention_hours: parseInt(e.target.value) || 48 })}
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="demoModeCheck"
                checked={settings.demo_mode}
                onChange={(e) => setSettings({ ...settings, demo_mode: e.target.checked })}
                className="rounded bg-surface-200 border-surface-border text-cyan-500 focus:ring-0"
              />
              <label htmlFor="demoModeCheck" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold text-slate-100">Enable Demo Simulation Features</span>
                <p className="text-[11px] text-slate-400">
                  Allows interactive triggering of simulated CPU saturation, bit-rot corruption, and OOM incidents.
                </p>
              </label>
            </div>
          </div>

          {/* Section 3: Security & Storage Roots */}
          <div className="p-6 rounded-xl bg-surface-card border border-surface-border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-surface-border pb-3">
              <FolderLock className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Filesystem Security Boundaries</h3>
                <p className="text-xs text-slate-400">Allowed root directories and backup repository location.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Backup Storage Volume:</span>
                <div className="p-2.5 rounded bg-surface-200 font-mono text-slate-200 border border-surface-border">
                  {settings.backup_storage_path}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1">Configured Allowed Roots:</span>
                <div className="p-2.5 rounded bg-surface-200 font-mono text-cyan-400 border border-surface-border space-y-1">
                  {settings.allowed_roots?.map((r, i) => (
                    <div key={i} className="truncate">• {r}</div>
                  )) || <div>No custom roots configured.</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-xs text-slate-300 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Defaults</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-950/40"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Persisting Settings..." : "Save Configuration"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
