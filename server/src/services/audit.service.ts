import prisma from "../lib/prisma";
import {
  AuditFinding,
  AuditInput,
  ProviderName,
  getProvider,
} from "./ai";

export interface AuditSessionResponse {
  id: string;
  language: string;
  provider: string;
  code: string;
  securityScore: number;
  issueCount: number;
  createdAt: string;
  vulnerabilities: Array<{
    id: string;
    ruleId: string;
    message: string;
    line: number;
    column: number | null;
    endLine: number | null;
    severity: string;
    category: string;
    snippet: string | null;
    suggestedFix: string | null;
  }>;
}

/** Run an audit: provider scan -> persist session + findings -> respond. */
export async function runAudit(
  input: AuditInput,
  providerName: ProviderName
): Promise<AuditSessionResponse> {
  const provider = getProvider(providerName);
  const result = await provider.audit(input);

  const session = await prisma.auditSession.create({
    data: {
      language: input.language,
      provider: provider.name,
      code: input.code,
      securityScore: result.securityScore,
      issueCount: result.findings.length,
      vulnerabilities: {
        create: result.findings.map((f: AuditFinding) => ({
          ruleId: f.ruleId,
          message: f.message,
          line: f.line,
          column: f.column,
          endLine: f.endLine,
          severity: f.severity,
          category: f.category,
          snippet: f.snippet,
          suggestedFix: f.suggestedFix,
        })),
      },
    },
    include: { vulnerabilities: { orderBy: { line: "asc" } } },
  });

  return serializeSession(session);
}

/** Fetch a single audit session with its findings. */
export async function getAuditById(
  id: string
): Promise<AuditSessionResponse | null> {
  const session = await prisma.auditSession.findUnique({
    where: { id },
    include: { vulnerabilities: { orderBy: { line: "asc" } } },
  });
  return session ? serializeSession(session) : null;
}

/** List recent sessions (newest first) for history views. */
export async function listAudits(limit = 20): Promise<AuditSessionResponse[]> {
  const sessions = await prisma.auditSession.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { vulnerabilities: { orderBy: { line: "asc" } } },
  });
  return sessions.map(serializeSession);
}

function serializeSession(session: {
  id: string;
  language: string;
  provider: string;
  code: string;
  securityScore: number;
  issueCount: number;
  createdAt: Date;
  vulnerabilities: Array<{
    id: string;
    ruleId: string;
    message: string;
    line: number;
    column: number | null;
    endLine: number | null;
    severity: string;
    category: string;
    snippet: string | null;
    suggestedFix: string | null;
  }>;
}): AuditSessionResponse {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
  };
}
