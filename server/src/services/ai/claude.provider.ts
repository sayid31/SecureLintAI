import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  extractJson,
  normalizeResult,
} from "./llm.shared";
import type { AuditInput, AuditProvider, AuditResult } from "./types";

/**
 * Provider LLM asli via Anthropic Messages API.
 * Tanpa ANTHROPIC_API_KEY → audit() melempar error; factory membungkusnya
 * dengan FallbackProvider sehingga otomatis jatuh ke mock scanner.
 */
export class ClaudeAuditProvider implements AuditProvider {
  readonly name = "claude" as const;

  async audit(input: AuditInput): Promise<AuditResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY belum di-set");

    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`Anthropic API ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n");
    if (!text) throw new Error("Claude mengembalikan konten kosong");

    return normalizeResult(extractJson(text));
  }
}
