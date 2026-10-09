export interface MetricPoint {
  id?: number;
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  network_sent_mb: number;
  network_recv_mb: number;
  process_count: number;
}

export interface SystemSummary {
  hostname: string;
  platform: string;
  os_name: string;
  os_version: string;
  architecture: string;
  python_version: string;
  boot_time: string;
  uptime_seconds: number;
  cpu_count_logical: number;
  cpu_count_physical: number;
  cpu_percent: number;
  memory_percent: number;
  memory_used_mb: number;
  memory_total_mb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  process_count: number;
  system_status: "healthy" | "warning" | "critical";
  status_reasons: string[];
  total_backups: number;
  last_successful_backup: string | null;
  open_incidents_count: number;
}

export interface SystemDiskInfo {
  device: string;
  mountpoint: string;
  fstype: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export interface SystemNetworkInfo {
  interface: string;
  bytes_sent_mb: number;
  bytes_recv_mb: number;
  packets_sent: number;
  packets_recv: number;
  is_up: boolean;
}

export interface BackupManifestEntry {
  rel_path: string;
  size_bytes: number;
  sha256: string;
  modified_time: string;
}

export interface BackupManifest {
  backup_id: string;
  created_at: string;
  source_label: string;
  source_path: string;
  file_count: number;
  total_uncompressed_bytes: number;
  files: BackupManifestEntry[];
}

export interface BackupItem {
  id: string;
  label: string;
  created_at: string;
  archive_format: string;
  archive_filename: string;
  archive_path: string;
  source_path: string;
  file_count: number;
  uncompressed_bytes: number;
  archive_size_bytes: number;
  sha256_checksum: string;
  status: "SUCCESS" | "FAILED";
  verification_status: "UNVERIFIED" | "VERIFIED" | "CORRUPTED" | "ERROR";
  last_verified_at: string | null;
  manifest: BackupManifest | null;
  error_message: string | null;
}

export interface BackupVerifyResult {
  backup_id: string;
  verification_status: "VERIFIED" | "CORRUPTED" | "ERROR";
  archive_checksum_match: boolean;
  manifest_checksum_match: boolean;
  verified_files_count: number;
  corrupted_files: string[];
  message: string;
  verified_at: string;
}

export interface RestorePreview {
  backup_id: string;
  destination_path: string;
  file_count: number;
  total_bytes: number;
  files_to_restore: string[];
  conflicts_exist: boolean;
  conflicting_files: string[];
  safe_to_proceed: boolean;
  warning_notes: string[];
}

export interface RestoreItem {
  id: string;
  backup_id: string;
  created_at: string;
  destination_path: string;
  file_count: number;
  bytes_restored: number;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  overwrite_used: boolean;
  sha256_report: Array<{
    rel_path: string;
    restored_bytes: number;
    sha256: string;
    status: string;
    error: string | null;
  }> | null;
  error_message: string | null;
}

export interface IncidentItem {
  id: string;
  title: string;
  severity: "informational" | "warning" | "critical";
  category: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  first_detected_at: string;
  last_observed_at: string;
  evidence: string | null;
  troubleshooting_steps: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
}

export interface IncidentListResult {
  total: number;
  open_count: number;
  acknowledged_count: number;
  resolved_count: number;
  incidents: IncidentItem[];
}

export interface LogEntryItem {
  id: number;
  timestamp: string;
  severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  component: string;
  event_type: string;
  message: string;
  related_id: string | null;
  extra_metadata: string | null;
}

export interface DiagnosticCheckResult {
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  category: string;
  message: string;
  details?: Record<string, any>;
  suggested_action?: string;
}

export interface DiagnosticReport {
  generated_at: string;
  overall_health: "HEALTHY" | "DEGRADED" | "CRITICAL";
  checks_run: number;
  passed_count: number;
  warn_count: number;
  failed_count: number;
  results: DiagnosticCheckResult[];
  recent_failures: Array<Record<string, any>>;
  recommendations: string[];
}

export interface AppSettings {
  cpu_warning_threshold: number;
  cpu_critical_threshold: number;
  memory_warning_threshold: number;
  memory_critical_threshold: number;
  disk_warning_threshold: number;
  disk_critical_threshold: number;
  polling_interval_seconds: number;
  metrics_retention_hours: number;
  demo_mode: boolean;
  allowed_roots: string[];
  backup_storage_path: string;
}
