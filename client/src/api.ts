/** Tipe & client untuk API SecureLint AI (lihat server/src/services/audit.service.ts). */

export type Language = "javascript" | "typescript" | "python";
export type Provider = "openai" | "claude";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface Vulnerability {
  id: string;
  sessionId: string;
  ruleId: string;
  message: string;
  line: number;
  column: number | null;
  endLine: number | null;
  severity: Severity;
  /** OWASP category, contoh "A03:2021 - Injection" */
  category: string;
  snippet: string | null;
  suggestedFix: string | null;
}

export interface AuditSession {
  id: string;
  language: string;
  provider: string;
  code: string;
  securityScore: number;
  issueCount: number;
  createdAt: string;
  vulnerabilities: Vulnerability[];
}

/** Warna per severity — dipakai badge, bar, dan chart. */
export const SEVERITY_META: Record<
  Severity,
  { label: string; text: string; bg: string; dot: string; hex: string }
> = {
  CRITICAL: {
    label: "Critical",
    text: "text-rose-300",
    bg: "bg-rose-500/15",
    dot: "bg-rose-500",
    hex: "#f43f5e",
  },
  HIGH: {
    label: "High",
    text: "text-orange-300",
    bg: "bg-orange-500/15",
    dot: "bg-orange-500",
    hex: "#f97316",
  },
  MEDIUM: {
    label: "Medium",
    text: "text-amber-300",
    bg: "bg-amber-500/15",
    dot: "bg-amber-500",
    hex: "#f59e0b",
  },
  LOW: {
    label: "Low",
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    dot: "bg-sky-500",
    hex: "#0ea5e9",
  },
  INFO: {
    label: "Info",
    text: "text-slate-300",
    bg: "bg-slate-500/15",
    dot: "bg-slate-400",
    hex: "#94a3b8",
  },
};

export const SEVERITY_ORDER: Severity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
];

/** Warna ring score berdasarkan nilai (makin tinggi makin hijau). */
export function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#f43f5e";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error("Tidak bisa terhubung ke server — pastikan backend berjalan di port 4000.");
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data as
      | { error?: string; details?: { fieldErrors?: Record<string, string[]> } }
      | null;
    let message = err?.error ?? `HTTP ${res.status}`;
    const fieldErrors = err?.details?.fieldErrors;
    if (fieldErrors) {
      const parts = Object.entries(fieldErrors).flatMap(([field, msgs]) =>
        (msgs ?? []).map((m) => `${field}: ${m}`)
      );
      if (parts.length > 0) message = `${message} — ${parts.join("; ")}`;
    }
    throw new Error(message);
  }

  return data as T;
}

export function runAudit(input: {
  code: string;
  language: Language;
  provider: Provider;
}): Promise<AuditSession> {
  return request<AuditSession>("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchAudits(): Promise<AuditSession[]> {
  return request<AuditSession[]>("/api/audits");
}

export function fetchAudit(id: string): Promise<AuditSession> {
  return request<AuditSession>(`/api/audits/${encodeURIComponent(id)}`);
}
