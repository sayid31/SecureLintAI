/**
 * Shared contract between the API layer and any AI provider
 * (mock keyword scanner, OpenAI, Claude, ...).
 */

export type SupportedLanguage = "javascript" | "typescript" | "python";
export type ProviderName = "openai" | "claude" | "mock";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

/** Strict JSON shape a provider must return for a single finding. */
export interface AuditFinding {
  ruleId: string;
  message: string;
  line: number;
  column: number | null;
  endLine: number | null;
  severity: Severity;
  /** OWASP category, e.g. "A03:2021 - Injection" */
  category: string;
  snippet: string | null;
  /** Inline diff-ready replacement for the flagged snippet. */
  suggestedFix: string | null;
}

/** Strict JSON shape a provider must return for a full audit. */
export interface AuditResult {
  findings: AuditFinding[];
  /** 0-100, higher is safer. */
  securityScore: number;
}

export interface AuditInput {
  code: string;
  language: SupportedLanguage;
}

export interface AuditProvider {
  readonly name: ProviderName;
  /** Providers must resolve to the strict AuditResult JSON. */
  audit(input: AuditInput): Promise<AuditResult>;
}
