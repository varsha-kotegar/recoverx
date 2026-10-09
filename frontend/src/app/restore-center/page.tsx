"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import { Modal } from "@/components/UI/Modal";
import {
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FileCheck,
  FolderOpen,
  ArrowRight,
  ShieldAlert,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api";
import { BackupItem, RestoreItem, RestorePreview } from "@/lib/types";
import { formatBytes, formatDate, truncateHash } from "@/lib/utils";

function RestoreContent() {
  const searchParams = useSearchParams();
  const preselectedBackupId = searchParams.get("backup_id");

  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [restores, setRestores] = useState<RestoreItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  // Restore Form State
  const [selectedBackupId, setSelectedBackupId] = useState<string>(preselectedBackupId || "");
  const [destinationPath, setDestinationPath] = useState<string>("data/restored_output");
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessItem, setRestoreSuccessItem] = useState<RestoreItem | null>(null);

  // Selected restore report modal
  const [inspectRestoreItem, setInspectRestoreItem] = useState<RestoreItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [bRes, rRes] = await Promise.all([api.listBackups(), api.listRestores()]);
      setBackups(bRes.backups);
      setRestores(rRes.restores);
      if (preselectedBackupId && !selectedBackupId) {
        setSelectedBackupId(preselectedBackupId);
      }
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to load restore data:", err);
      setApiConnected(false);
    } finally {
      setRefreshing(false);
    }
  }, [preselectedBackupId, selectedBackupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePreview = async () => {
    if (!selectedBackupId) {
      setRestoreError("Please select a backup archive snapshot.");
      return;
    }
    if (!destinationPath.trim()) {
      setRestoreError("Please specify a target restore destination.");
      return;
    }
    setIsPreviewing(true);
    setRestoreError(null);
    try {
      const res = await api.previewRestore(selectedBackupId, destinationPath.trim(), overwriteExisting);
      setPreview(res);
    } catch (err: any) {
      setRestoreError(err.message || "Failed to preview restore operation.");
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupId || !destinationPath.trim()) return;
    setIsRestoring(true);
    setRestoreError(null);
    try {
      const res = await api.executeRestore(selectedBackupId, destinationPath.trim(), overwriteExisting);
      setRestoreSuccessItem(res);
      setPreview(null);
      fetchData();
    } catch (err: any) {
      setRestoreError(err.message || "Restore operation failed.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="Restore Center & Disaster Recovery"
        subtitle="Staged atomic file restoration with pre-flight conflict check and post-restore SHA-256 verification."
        isRefreshing={refreshing}
        onRefresh={fetchData}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Restore Wizard Card */}
        <div className="p-6 rounded-xl bg-surface-card border border-surface-border shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-surface-border pb-3">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">Disaster Recovery Restore Wizard</h3>
              <p className="text-xs text-slate-400">Safely reconstruct files into a verified target path.</p>
            </div>
          </div>

          {restoreError && (
            <div className="p-3 mb-4 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1: Select Backup Snapshot */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  1. Choose Backup Snapshot <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedBackupId}
                  onChange={(e) => {
                    setSelectedBackupId(e.target.value);
                    setPreview(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Select a verified backup archive --</option>
                  {backups.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label} ({b.id}) - {formatBytes(b.archive_size_bytes)} - {b.verification_status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Target Destination */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  2. Destination Path <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. data/restored_output or C:\PROJECTS\RECOVERX\data\restored"
                  value={destinationPath}
                  onChange={(e) => {
                    setDestinationPath(e.target.value);
                    setPreview(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Target must resolve within permitted security boundaries.
                </p>
              </div>

              {/* Overwrite Confirmation */}
              <div className="p-3 rounded-lg bg-surface-200/60 border border-surface-border flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="overwriteToggle"
                  checked={overwriteExisting}
                  onChange={(e) => {
                    setOverwriteExisting(e.target.checked);
                    setPreview(null);
                  }}
                  className="mt-0.5 rounded bg-surface-card border-surface-border text-cyan-500 focus:ring-0"
                />
                <label htmlFor="overwriteToggle" className="text-xs text-slate-300 cursor-pointer">
                  <span className="font-semibold text-slate-200">Overwrite Existing Files</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    If unchecked, conflicting files in destination are skipped to prevent accidental data loss.
                  </p>
                </label>
              </div>

              <button
                type="button"
                onClick={handlePreview}
                disabled={isPreviewing || !selectedBackupId}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isPreviewing ? "Analyzing Archive..." : "Preview Restore & Check Conflicts"}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Step 3: Preview Box */}
            <div className="p-4 rounded-xl bg-surface-200/50 border border-surface-border flex flex-col justify-between">
              {preview ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-border pb-2">
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Pre-flight Validation
                    </span>
                    <Badge variant={preview.conflicts_exist ? "warning" : "success"} size="sm">
                      {preview.conflicts_exist ? "Conflicts Detected" : "Clear Destination"}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Files to Restore:</span>
                      <span className="font-mono font-semibold">{preview.file_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Uncompressed Payload:</span>
                      <span className="font-mono font-semibold">{formatBytes(preview.total_bytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Folder:</span>
                      <span className="font-mono text-slate-200 truncate max-w-[200px]">{preview.destination_path}</span>
                    </div>
                  </div>

                  {preview.warning_notes.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800 text-[11px] text-amber-300">
                      {preview.warning_notes.map((n, i) => (
                        <p key={i}>• {n}</p>
                      ))}
                    </div>
                  )}

                  {/* Files List Preview */}
                  <div className="text-xs text-slate-400 font-semibold">Included Files:</div>
                  <div className="max-h-32 overflow-y-auto bg-surface-card rounded p-2 border border-surface-border text-[11px] font-mono text-slate-300 space-y-1">
                    {preview.files_to_restore.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="w-full mt-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isRestoring ? "Restoring Staged Files..." : "Confirm & Execute Restore"}
                  </button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <FileCheck className="w-10 h-10 mb-2 opacity-50 text-cyan-400" />
                  <p className="text-xs">
                    Select a snapshot and click "Preview Restore" to inspect manifest files and conflict checks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Restore History Table */}
        <div className="rounded-xl bg-surface-card border border-surface-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-100">Disaster Recovery Restore History</h3>
            </div>
            <Badge variant="neutral" size="sm">{restores.length} Records</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sidebar/60 text-slate-400 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Restore Operation ID</th>
                  <th className="py-3 px-4">Source Snapshot</th>
                  <th className="py-3 px-4">Target Destination</th>
                  <th className="py-3 px-4">Restored Data</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Integrity Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {restores.length > 0 ? (
                  restores.map((rst) => (
                    <tr key={rst.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        {rst.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {rst.backup_id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 truncate max-w-[200px]" title={rst.destination_path}>
                        {rst.destination_path}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        {formatBytes(rst.bytes_restored)} ({rst.file_count} files)
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            rst.status === "SUCCESS"
                              ? "success"
                              : rst.status === "PARTIAL"
                              ? "warning"
                              : "danger"
                          }
                          size="sm"
                          dot={rst.status === "SUCCESS"}
                        >
                          {rst.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatDate(rst.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setInspectRestoreItem(rst)}
                          className="px-2.5 py-1 rounded bg-surface-200 hover:bg-surface-hover border border-surface-border text-cyan-400 hover:text-cyan-300 transition-colors text-[11px] font-medium"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">
                      No restore operations logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RESTORE SUCCESS MODAL */}
      <Modal
        isOpen={!!restoreSuccessItem}
        onClose={() => setRestoreSuccessItem(null)}
        title="Disaster Recovery Restore Completed"
        description={`Restore ID: ${restoreSuccessItem?.id}`}
      >
        {restoreSuccessItem && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-300 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">Files Restored & Verified Successfully</h4>
                <p className="text-xs mt-0.5 opacity-90">
                  Restored {restoreSuccessItem.file_count} files ({formatBytes(restoreSuccessItem.bytes_restored)}) to destination.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-300 font-mono">
              <div>Destination: {restoreSuccessItem.destination_path}</div>
              <div className="mt-1 text-slate-400">Timestamp: {formatDate(restoreSuccessItem.created_at)}</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRestoreSuccessItem(null)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RESTORE REPORT DETAILS MODAL */}
      <Modal
        isOpen={!!inspectRestoreItem}
        onClose={() => setInspectRestoreItem(null)}
        title={`Restore Audit Report — ${inspectRestoreItem?.id || ""}`}
        description={`Backup ID: ${inspectRestoreItem?.backup_id} | Restored: ${formatDate(inspectRestoreItem?.created_at)}`}
        maxWidth="xl"
      >
        {inspectRestoreItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-200 border border-surface-border text-xs flex justify-between items-center">
              <div>
                <span className="text-slate-400">Target Path:</span>{" "}
                <span className="font-mono text-slate-200">{inspectRestoreItem.destination_path}</span>
              </div>
              <Badge
                variant={inspectRestoreItem.status === "SUCCESS" ? "success" : "danger"}
                size="sm"
              >
                {inspectRestoreItem.status}
              </Badge>
            </div>

            <div className="rounded-lg border border-surface-border overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-sidebar/80 text-slate-400 uppercase tracking-wider border-b border-surface-border sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">File Path</th>
                      <th className="py-2.5 px-3">Restored Bytes</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">SHA-256 Checksum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {inspectRestoreItem.sha256_report?.map((r, i) => (
                      <tr key={i} className="hover:bg-surface-hover/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-200">{r.rel_path}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{formatBytes(r.restored_bytes)}</td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={r.status === "RESTORED" ? "success" : "warning"}
                            size="sm"
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-400 truncate max-w-[150px]">
                          {r.sha256 ? truncateHash(r.sha256, 8, 8) : "-"}
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-500">
                          Report payload unavailable.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectRestoreItem(null)}
                className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function RestoreCenterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Loading Restore Center...</div>}>
      <RestoreContent />
    </Suspense>
  );
}
