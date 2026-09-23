import { ClaudeAuditProvider } from "./claude.provider";
import { MockAuditProvider } from "./mock.provider";
import { OpenAIAuditProvider } from "./openai.provider";
import { AuditProvider, AuditInput, AuditResult, ProviderName } from "./types";

export * from "./types";
export { MockAuditProvider, OpenAIAuditProvider, ClaudeAuditProvider };
export { computeSecurityScore, SEVERITY_PENALTY } from "./scoring";

/**
 * Membungkus primary (LLM asli) dengan fallback (mock scanner).
 * - Primary gagal (key kosong, network error, respons tidak valid) → log +
 *   pakai fallback, dan `name` ikut berubah supaya session di DB jujur
 *   mencatat provider yang BENAR-BENAR menghasilkan findings.
 * - `name` dibaca service SETELAH audit() → nilai getter sudah final.
 */
class FallbackProvider implements AuditProvider {
  private usedFallback = false;

  constructor(
    private readonly primary: AuditProvider,
    private readonly secondary: AuditProvider
  ) {}

  get name(): ProviderName {
    return this.usedFallback ? this.secondary.name : this.primary.name;
  }

  async audit(input: AuditInput): Promise<AuditResult> {
    try {
      return await this.primary.audit(input);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(
        `[ai] ${this.primary.name} gagal (${reason}) → fallback ke ${this.secondary.name}`
      );
      this.usedFallback = true;
      return this.secondary.audit(input);
    }
  }
}

/**
 * Resolves the requested provider to a concrete implementation.
 * - openai/claude → provider LLM asli BILA API key tersedia;
 *   kalau tidak (atau error runtime) otomatis fallback ke mock scanner.
 * - mock → scanner keyword deterministik.
 *
 * Instance baru tiap pemanggilan supaya state fallback tidak bocor
 * antar request.
 */
export function getProvider(requested: ProviderName): AuditProvider {
  switch (requested) {
    case "openai":
      return new FallbackProvider(new OpenAIAuditProvider(), new MockAuditProvider());
    case "claude":
      return new FallbackProvider(new ClaudeAuditProvider(), new MockAuditProvider());
    case "mock":
    default:
      return new MockAuditProvider();
  }
}
