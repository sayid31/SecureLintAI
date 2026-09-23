/**
 * Shared scoring rules — satu sumber kebenaran untuk semua provider
 * (mock scanner maupun LLM OpenAI/Claude).
 */

import type { AuditFinding, Severity } from "./types";

/** Score penalty applied per severity when computing securityScore. */
export const SEVERITY_PENALTY: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

/** 100 − Σ(severity penalty), clamped to 0–100. */
export function computeSecurityScore(findings: AuditFinding[]): number {
  const penalty = findings.reduce(
    (sum, f) => sum + (SEVERITY_PENALTY[f.severity] ?? 0),
    0
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}
