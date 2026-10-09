"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Layout/Header";
import { Badge } from "@/components/UI/Badge";
import { Modal } from "@/components/UI/Modal";
import {
  Archive,
  Plus,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Copy,
  Trash2,
  RotateCcw,
  Search,
  Check,
  FolderOpen,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { BackupItem, BackupVerifyResult } from "@/lib/types";
import { formatBytes, formatDate, truncateHash } from "@/lib/utils";
import Link from "next/link";

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sourcePath, setSourcePath] = useState("");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Manifest View Modal State
  const [selectedManifestBackup, setSelectedManifestBackup] = useState<BackupItem | null>(null);

  // Verification Modal State
  const [verifyResult, setVerifyResult] = useState<BackupVerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<BackupItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.listBackups();
      setBackups(res.backups);
      setApiConnected(true);
    } catch (err) {
      console.error("Failed to fetch backups:", err);
      setApiConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePath.trim()) {
      setCreateError("Source path is required.");
      return;
    }
    setIsSubmitting(true);
    setCreateError(null);
    try {
      await api.createBackup(sourcePath.trim(), label.trim() || undefined);
      setIsCreateOpen(false);
      setSourcePath("");
      setLabel("");
      fetchBackups();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create backup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (backupId: string) => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyBackup(backupId);
      setVerifyResult(result);
      fetchBackups();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteBackup(deleteTarget.id);
      setDeleteTarget(null);
      fetchBackups();
    } catch (err: any) {
      alert(`Failed to delete backup: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredBackups = backups.filter(
    (b) =>
      b.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.source_path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header
        title="Backup Center & Cryptographic Manifests"
        subtitle="Manage snapshot archives, compute SHA-256 digests, and inspect manifest integrity."
        isRefreshing={refreshing}
        onRefresh={fetchBackups}
        apiConnected={apiConnected}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search backups by label, ID, or source path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-card border border-surface-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-cyan-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Backup</span>
          </button>
        </div>

        {/* Backups Table */}
        <div className="rounded-xl bg-surface-card border border-surface-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">Backup Snapshots Archive</h3>
            </div>
            <Badge variant="neutral" size="sm">
              {filteredBackups.length} Available
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-sidebar/60 text-slate-400 uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Backup Label & ID</th>
                  <th className="py-3 px-4">Source Directory</th>
                  <th className="py-3 px-4">Files / Size</th>
                  <th className="py-3 px-4">SHA-256 Archive Hash</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {filteredBackups.length > 0 ? (
                  filteredBackups.map((bkp) => (
                    <tr key={bkp.id} className="hover:bg-surface-hover/50 transition-colors">
                      {/* Label & ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{bkp.label}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{bkp.id}</div>
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4 text-slate-300 truncate max-w-[180px]" title={bkp.source_path}>
                        {bkp.source_path}
                      </td>

                      {/* Files / Size */}
                      <td className="py-3.5 px-4 font-mono text-slate-200">
                        {bkp.file_count} files
                        <div className="text-[10px] text-slate-400">{formatBytes(bkp.archive_size_bytes)}</div>
                      </td>

                      {/* SHA-256 Hash */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                          <span>{truncateHash(bkp.sha256_checksum, 6, 6)}</span>
                          <button
                            onClick={() => copyToClipboard(bkp.sha256_checksum, bkp.id)}
                            className="p-1 hover:text-cyan-400 transition-colors"
                            title="Copy full SHA-256 hash"
                          >
                            {copiedId === bkp.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            bkp.verification_status === "VERIFIED"
                              ? "success"
                              : bkp.verification_status === "CORRUPTED"
                              ? "danger"
                              : bkp.verification_status === "ERROR"
                              ? "danger"
                              : "neutral"
                          }
                          size="sm"
                          dot={bkp.verification_status === "VERIFIED"}
                        >
                          {bkp.verification_status}
                        </Badge>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatDate(bkp.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Verify Checksum Button */}
                          <button
                            onClick={() => handleVerify(bkp.id)}
                            disabled={isVerifying}
                            className="p-1.5 rounded-md bg-surface-200 hover:bg-surface-hover border border-surface-border text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Run SHA-256 Verification"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Inspect Manifest */}
                          <button
                            onClick={() => setSelectedManifestBackup(bkp)}
                            className="p-1.5 rounded-md bg-surface-200 hover:bg-surface-hover border border-surface-border text-slate-300 hover:text-slate-100 transition-colors"
                            title="Inspect Manifest & Hashes"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Restore Link */}
                          <Link
                            href={`/restore-center?backup_id=${bkp.id}`}
                            className="p-1.5 rounded-md bg-surface-200 hover:bg-surface-hover border border-surface-border text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Restore from this backup"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(bkp)}
                            className="p-1.5 rounded-md bg-surface-200 hover:bg-surface-hover border border-surface-border text-rose-400 hover:text-rose-300 transition-colors"
                            title="Delete Backup"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500">
                      No backups found. Click "Create New Backup" above to archive sample files.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE BACKUP MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Secure Backup Archive"
        description="Select a source directory within permitted roots to generate a verifiable ZIP archive with cryptographic SHA-256 manifests."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Source Directory / File Path <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. sample_data/configs or C:\PROJECTS\RECOVERX\sample_data"
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Paths must resolve strictly inside configured permitted roots.
            </p>
          </div>

          {/* Quick Select Preset Samples */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Quick Select Sample Data:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Configs", path: "sample_data/configs", desc: "Nginx & system settings" },
                { label: "Database Dumps", path: "sample_data/db_backups", desc: "SQL schema & tables" },
                { label: "App Logs", path: "sample_data/app_logs", desc: "Access & operational logs" },
                { label: "Documentation", path: "sample_data/documentation", desc: "SOP & runbooks" },
              ].map((preset) => (
                <button
                  type="button"
                  key={preset.path}
                  onClick={() => {
                    setSourcePath(preset.path);
                    if (!label) setLabel(`Backup of ${preset.label}`);
                  }}
                  className="p-2 rounded-lg bg-surface-200/80 hover:bg-surface-hover border border-surface-border text-left transition-colors"
                >
                  <div className="font-semibold text-xs text-cyan-400 flex items-center gap-1">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{preset.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Backup Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Pre-deployment System State"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-all shadow-md flex items-center gap-2"
            >
              {isSubmitting ? "Creating Archive..." : "Generate Backup"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MANIFEST INSPECTOR MODAL */}
      <Modal
        isOpen={!!selectedManifestBackup}
        onClose={() => setSelectedManifestBackup(null)}
        title={`Backup Manifest — ${selectedManifestBackup?.label || ""}`}
        description={`Backup ID: ${selectedManifestBackup?.id} | Created: ${formatDate(selectedManifestBackup?.created_at)}`}
        maxWidth="xl"
      >
        {selectedManifestBackup && (
          <div className="space-y-4">
            {/* Archive Summary Banner */}
            <div className="p-3.5 rounded-lg bg-surface-200 border border-surface-border text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-slate-400">Total Uncompressed:</span>{" "}
                <span className="font-mono text-slate-200">{formatBytes(selectedManifestBackup.uncompressed_bytes)}</span>
              </div>
              <div>
                <span className="text-slate-400">Compressed Archive:</span>{" "}
                <span className="font-mono text-slate-200">{formatBytes(selectedManifestBackup.archive_size_bytes)}</span>
              </div>
              <div>
                <span className="text-slate-400">File Count:</span>{" "}
                <span className="font-mono text-slate-200">{selectedManifestBackup.file_count}</span>
              </div>
              <div>
                <span className="text-slate-400">Archive Hash:</span>{" "}
                <span className="font-mono text-cyan-400">{truncateHash(selectedManifestBackup.sha256_checksum, 8, 8)}</span>
              </div>
            </div>

            {/* Files in Manifest Table */}
            <div className="rounded-lg border border-surface-border overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-sidebar/80 text-slate-400 uppercase tracking-wider border-b border-surface-border sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Relative File Path</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">SHA-256 Checksum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/60">
                    {selectedManifestBackup.manifest?.files?.map((f, i) => (
                      <tr key={i} className="hover:bg-surface-hover/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-200">{f.rel_path}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{formatBytes(f.size_bytes)}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-cyan-400">{f.sha256}</td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-slate-500">
                          Manifest payload unavailable.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedManifestBackup(null)}
                className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* VERIFICATION REPORT MODAL */}
      <Modal
        isOpen={!!verifyResult}
        onClose={() => setVerifyResult(null)}
        title="SHA-256 Cryptographic Verification Report"
        description={`Verification timestamp: ${formatDate(verifyResult?.verified_at)}`}
      >
        {verifyResult && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                verifyResult.verification_status === "VERIFIED"
                  ? "bg-emerald-950/30 border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/30 border-rose-800/60 text-rose-300"
              }`}
            >
              {verifyResult.verification_status === "VERIFIED" ? (
                <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <h4 className="font-semibold text-sm">
                  {verifyResult.verification_status === "VERIFIED"
                    ? "Cryptographic Verification Passed"
                    : "Integrity Verification Failed / Tampering Detected"}
                </h4>
                <p className="text-xs mt-0.5 opacity-90">{verifyResult.message}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-200/70 border border-surface-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Archive Checksum Match:</span>
                <span className={`font-mono font-semibold ${verifyResult.archive_checksum_match ? "text-emerald-400" : "text-rose-400"}`}>
                  {verifyResult.archive_checksum_match ? "MATCH (100%)" : "MISMATCH (CORRUPTED)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Manifest File Hashes Match:</span>
                <span className={`font-mono font-semibold ${verifyResult.manifest_checksum_match ? "text-emerald-400" : "text-rose-400"}`}>
                  {verifyResult.manifest_checksum_match ? "MATCH (100%)" : "MISMATCH"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verified Files Count:</span>
                <span className="font-mono text-slate-200">{verifyResult.verified_files_count}</span>
              </div>
            </div>

            {verifyResult.corrupted_files.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800 text-xs">
                <div className="font-semibold text-rose-300 mb-1">Discrepancy Details:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-rose-300 font-mono text-[11px]">
                  {verifyResult.corrupted_files.map((cf, i) => (
                    <li key={i}>{cf}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setVerifyResult(null)}
                className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
              >
                Close Report
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Backup Deletion"
        description="This will permanently delete the archive file from disk and remove its database record."
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>Are you sure you want to delete backup snapshot "{deleteTarget.label}" ({deleteTarget.id})?</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-surface-200 hover:bg-surface-hover text-xs text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-slate-100 font-semibold text-xs"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
