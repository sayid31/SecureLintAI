import { Request, Response } from "express";
import { z } from "zod";
import { getAuditById, listAudits, runAudit } from "../services/audit.service";

const auditBodySchema = z.object({
  code: z.string().min(1, "code is required").max(100_000, "code too large"),
  language: z.enum(["javascript", "typescript", "python"]),
  provider: z.enum(["openai", "claude"]),
});

/** POST /api/audit — run an audit and persist the session. */
export async function createAudit(req: Request, res: Response) {
  const parsed = auditBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten(),
    });
  }

  try {
    const session = await runAudit(parsed.data, parsed.data.provider);
    return res.status(201).json(session);
  } catch (err) {
    console.error("[audit] failed to run audit:", err);
    return res.status(500).json({ error: "Failed to run audit" });
  }
}

/** GET /api/audits/:id — fetch one session with vulnerabilities. */
export async function getAudit(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const session = await getAuditById(id);
    if (!session) {
      return res.status(404).json({ error: `Audit session ${id} not found` });
    }
    return res.json(session);
  } catch (err) {
    console.error("[audit] failed to fetch audit:", err);
    return res.status(500).json({ error: "Failed to fetch audit" });
  }
}

/** GET /api/audits — recent sessions, newest first. */
export async function getAudits(req: Request, res: Response) {
  try {
    const sessions = await listAudits();
    return res.json(sessions);
  } catch (err) {
    console.error("[audit] failed to list audits:", err);
    return res.status(500).json({ error: "Failed to list audits" });
  }
}
