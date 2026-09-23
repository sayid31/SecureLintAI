/**
 * Shared harness untuk provider LLM (OpenAI & Claude):
 * prompt ketat → parse JSON → validasi Zod → normalisasi AuditResult.
 */

import { z } from "zod";
import { computeSecurityScore } from "./scoring";
import type { AuditFinding, AuditInput, AuditResult } from "./types";

export const SYSTEM_PROMPT = `You are SecureLint AI, a code security auditor.
Analyze the code the user sends and respond with STRICT JSON only — no prose, no markdown fences.

Output shape:
{
  "findings": [
    {
      "ruleId": "AI-001",
      "message": "what is wrong and why it matters (max 1-2 sentences)",
      "line": 1,
      "column": 1,
      "endLine": null,
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "category": "A03:2021 - Injection",
      "snippet": "the offending source line",
      "suggestedFix": "replacement code for that line, or null if none"
    }
  ],
  "securityScore": 0
}

Rules:
- line/column are 1-based integers; column may be null when unsure.
- category MUST use OWASP Top 10 (2021) format, e.g. "A03:2021 - Injection",
  "A07:2021 - Identification and Authentication Failures".
- ruleId: sequential "AI-001", "AI-002", ...
- suggestedFix must be a drop-in replacement for snippet, or null.
- securityScore = 100 minus penalties: CRITICAL 25, HIGH 15, MEDIUM 8, LOW 3, INFO 1,
  clamped to 0..100. Recompute it yourself; do not copy the user's number.
- Only report real issues visible in the code. No speculation, no style nitpicks.
- findings sorted by line ascending. Use "findings": [] when the code is clean.`;

export function buildUserPrompt({ code, language }: AuditInput): string {
  return `Language: ${language}\n\nCode:\n${code}`;
}

const findingSchema = z.object({
  ruleId: z.string().min(1).max(32),
  message: z.string().min(1).max(500),
  line: z.number().int().min(1),
  column: z.number().int().min(1).nullish(),
  endLine: z.number().int().min(1).nullish(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  category: z.string().min(3).max(120),
  snippet: z.string().max(2000).nullish(),
  suggestedFix: z.string().max(4000).nullish(),
});

const auditResponseSchema = z.object({
  findings: z.array(findingSchema).max(200),
  securityScore: z.number().min(0).max(100).optional(),
});

/** Buang code fence dan ekstrak objek JSON pertama dari teks bebas. */
export function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Respons AI tidak mengandung JSON object");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Validasi + rapikan hasil LLM menjadi AuditResult yang kontrak-ketat. */
export function normalizeResult(raw: unknown): AuditResult {
  const parsed = auditResponseSchema.parse(raw); // ZodError → dilempar → fallback provider

  const findings: AuditFinding[] = parsed.findings
    .map((f) => ({
      ...f,
      column: f.column ?? null,
      endLine: f.endLine ?? null,
      snippet: f.snippet ?? null,
      suggestedFix: f.suggestedFix ?? null,
    }))
    .sort((a, b) => a.line - b.line);

  // Score AI dipercaya bila valid; selalu cross-check dengan penalty resmi
  // (biar tampilan UI konsisten dengan formula skor proyek).
  return {
    findings,
    securityScore: computeSecurityScore(findings),
  };
}
