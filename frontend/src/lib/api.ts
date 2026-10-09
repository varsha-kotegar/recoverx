import {
  SystemSummary,
  MetricPoint,
  SystemDiskInfo,
  SystemNetworkInfo,
  BackupItem,
  BackupVerifyResult,
  RestorePreview,
  RestoreItem,
  IncidentListResult,
  IncidentItem,
  LogEntryItem,
  DiagnosticReport,
  AppSettings,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // fallback to status text
      }
      throw new Error(errorDetail);
    }

    return await res.json();
  } catch (err: any) {
    console.error(`API Error on [${options?.method || "GET"}] ${url}:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => fetchJson<{ status: string; app: string; version: string; environment: string; demo_mode: boolean }>("/health"),
  checkReadiness: () => fetchJson<{ status: string; database: string }>("/readyz"),

  // System Health & Monitoring
  getSystemSummary: () => fetchJson<SystemSummary>("/system/summary"),
  getLiveMetrics: () => fetchJson<MetricPoint>("/system/metrics"),
  getMetricsHistory: (limit = 60) => fetchJson<MetricPoint[]>(`/system/metrics/history?limit=${limit}`),
  getDisks: () => fetchJson<SystemDiskInfo[]>("/system/disks"),
  getNetwork: () => fetchJson<SystemNetworkInfo[]>("/system/network"),

  // Backups
  listBackups: () => fetchJson<{ total: number; backups: BackupItem[] }>("/backups"),
  getBackup: (id: string) => fetchJson<BackupItem>(`/backups/${id}`),
  createBackup: (source_path: string, label?: string) =>
    fetchJson<BackupItem>("/backups", {
      method: "POST",
      body: JSON.stringify({ source_path, label }),
    }),
  verifyBackup: (id: string) =>
    fetchJson<BackupVerifyResult>(`/backups/${id}/verify`, {
      method: "POST",
    }),
  deleteBackup: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/backups/${id}`, {
      method: "DELETE",
    }),

  // Restores
  previewRestore: (backup_id: string, destination_path: string, overwrite_existing = false) =>
    fetchJson<RestorePreview>(`/backups/${backup_id}/restore/preview`, {
      method: "POST",
      body: JSON.stringify({ destination_path, overwrite_existing }),
    }),
  executeRestore: (backup_id: string, destination_path: string, overwrite_existing = false) =>
    fetchJson<RestoreItem>(`/backups/${backup_id}/restore`, {
      method: "POST",
      body: JSON.stringify({ destination_path, overwrite_existing }),
    }),
  listRestores: () => fetchJson<{ total: number; restores: RestoreItem[] }>("/restores"),
  getRestore: (id: string) => fetchJson<RestoreItem>(`/restores/${id}`),

  // Incidents
  listIncidents: (status?: string, category?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (category) params.append("category", category);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return fetchJson<IncidentListResult>(`/incidents${qs}`);
  },
  getIncident: (id: string) => fetchJson<IncidentItem>(`/incidents/${id}`),
  acknowledgeIncident: (id: string) =>
    fetchJson<IncidentItem>(`/incidents/${id}/acknowledge`, {
      method: "POST",
    }),
  resolveIncident: (id: string, resolution_notes: string) =>
    fetchJson<IncidentItem>(`/incidents/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes }),
    }),
  simulateIncident: (incident_type: string, severity = "warning", custom_title?: string, custom_description?: string) =>
    fetchJson<IncidentItem>("/demo/simulate-incident", {
      method: "POST",
      body: JSON.stringify({ incident_type, severity, custom_title, custom_description }),
    }),

  // Diagnostic Logs
  listLogs: (params?: { severity?: string; component?: string; event_type?: string; search?: string; page?: number; page_size?: number }) => {
    const sp = new URLSearchParams();
    if (params?.severity) sp.append("severity", params.severity);
    if (params?.component) sp.append("component", params.component);
    if (params?.event_type) sp.append("event_type", params.event_type);
    if (params?.search) sp.append("search", params.search);
    if (params?.page) sp.append("page", String(params.page));
    if (params?.page_size) sp.append("page_size", String(params.page_size));
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return fetchJson<{ total: number; page: number; page_size: number; logs: LogEntryItem[] }>(`/logs${qs}`);
  },
  runDiagnostics: () =>
    fetchJson<DiagnosticReport>("/diagnostics/run", {
      method: "POST",
    }),

  // Settings
  getSettings: () => fetchJson<AppSettings>("/settings"),
  updateSettings: (settings: AppSettings) =>
    fetchJson<{ success: boolean; message: string; settings: AppSettings }>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};
