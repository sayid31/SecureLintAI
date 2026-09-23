import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  extractJson,
  normalizeResult,
} from "./llm.shared";
import type { AuditInput, AuditProvider, AuditResult } from "./types";

/**
 * Provider LLM asli via OpenAI Chat Completions.
 * Tanpa OPENAI_API_KEY → audit() melempar error; factory membungkusnya
 * dengan FallbackProvider sehingga otomatis jatuh ke mock scanner.
 */
export class OpenAIAuditProvider implements AuditProvider {
  readonly name = "openai" as const;

  async audit(input: AuditInput): Promise<AuditResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY belum di-set");

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`OpenAI API ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI mengembalikan konten kosong");

    return normalizeResult(extractJson(content));
  }
}
