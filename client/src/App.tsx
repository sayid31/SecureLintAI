import { useCallback, useEffect, useMemo, useState } from "react";
import CodeEditor from "./components/CodeEditor";
import DiffPanel from "./components/DiffPanel";
import FindingList from "./components/FindingList";
import HistoryList from "./components/HistoryList";
import OwaspBreakdown from "./components/OwaspBreakdown";
import ScoreGauge from "./components/ScoreGauge";
import {
  SEVERITY_META,
  SEVERITY_ORDER,
  fetchAudit,
  fetchAudits,
  runAudit,
  type AuditSession,
  type Language,
  type Provider,
  type Severity,
} from "./api";

const SAMPLE_CODE = `// Contoh kode berisi beberapa vulnerability
function login(username, password) {
  const secret = "admin123";
  const query = "SELECT * FROM users WHERE name = '" + username + "'";
  eval(password);
  console.log("login attempt:", username);
}
`;

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
];

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "claude", label: "Claude" },
];

export default function App() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState<Language>("javascript");
  const [provider, setProvider] = useState<Provider>("openai");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditSession | null>(null);

  const [history, setHistory] = useState<AuditSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await fetchAudits());
    } catch (err) {
      console.error("Gagal memuat riwayat:", err);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await runAudit({ code, language, provider });
      setResult(session);
      setSelectedId(session.id);
      void refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit gagal dijalankan.");
    } finally {
      setLoading(false);
    }
  }, [code, language, provider, refreshHistory]);

  const handleSelectHistory = useCallback(async (id: string) => {
    setError(null);
    try {
      const session = await fetchAudit(id);
      setResult(session);
      setSelectedId(session.id);
      setCode(session.code);
      setLanguage(session.language as Language);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat session.");
    }
  }, []);

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };
    for (const v of result?.vulnerabilities ?? []) counts[v.severity] += 1;
    return counts;
  }, [result]);

  const selectClass =
    "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-slate-500";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-lg">
            🛡️
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              SecureLint <span className="text-emerald-400">AI</span>
            </h1>
            <p className="text-[11px] text-slate-500">
              AI-powered code security &amp; quality auditor
            </p>
          </div>
          <span className="ml-auto hidden rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-400 sm:block">
            MVP · mock scanner
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
        {/* Kolom kiri: editor + hasil */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <label className="flex flex-col gap-1 text-[11px] text-slate-500">
              Bahasa
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className={selectClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-[11px] text-slate-500">
              Provider AI
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className={selectClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={loading || code.trim().length === 0}
              className="ml-auto rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Menganalisis…" : "Jalankan Audit"}
            </button>
            <span className="w-full text-[11px] text-slate-500 sm:w-auto">
              Ctrl+Enter di editor · kedua provider → mock di MVP
            </span>
          </div>

          <div className="h-[420px] overflow-hidden rounded-xl border border-slate-800">
            <CodeEditor
              value={code}
              language={language}
              onChange={setCode}
              onRunShortcut={() => void handleRun()}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-300">
                  Hasil Audit
                </h2>
                <span className="text-[11px] text-slate-500">
                  {new Date(result.createdAt).toLocaleString("id-ID")} ·{" "}
                  {result.provider} · {result.language} · {result.issueCount}{" "}
                  issue
                </span>
                <span
                  className="ml-auto rounded-full px-3 py-1 text-xs font-bold tabular-nums"
                  style={{
                    backgroundColor:
                      result.securityScore >= 80
                        ? "rgba(34,197,94,.15)"
                        : result.securityScore >= 50
                          ? "rgba(245,158,11,.15)"
                          : "rgba(244,63,94,.15)",
                    color:
                      result.securityScore >= 80
                        ? "#4ade80"
                        : result.securityScore >= 50
                          ? "#fcd34d"
                          : "#fb7185",
                  }}
                >
                  Score {result.securityScore}/100
                </span>
              </div>

              <FindingList vulnerabilities={result.vulnerabilities} />

              {result.vulnerabilities.some((v) => v.suggestedFix) && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-300">
                    Quick Fix — {result.vulnerabilities.find((v) => v.suggestedFix)?.ruleId}
                  </h3>
                  {(() => {
                    const first = result.vulnerabilities.find(
                      (v) => v.suggestedFix && v.snippet
                    );
                    return first ? (
                      <DiffPanel before={first.snippet ?? ""} after={first.suggestedFix ?? ""} />
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Kolom kanan: score, OWASP, riwayat */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            {result ? (
              <>
                <ScoreGauge score={result.securityScore} />
                <div className="mt-4 grid grid-cols-5 gap-1 text-center">
                  {SEVERITY_ORDER.map((sev) => (
                    <div
                      key={sev}
                      className="rounded-lg bg-slate-950/60 py-2"
                      title={SEVERITY_META[sev].label}
                    >
                      <div
                        className="text-lg font-bold tabular-nums"
                        style={{ color: SEVERITY_META[sev].hex }}
                      >
                        {severityCounts[sev]}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        {SEVERITY_META[sev].label}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm text-slate-500">
                  Jalankan audit untuk melihat
                  <br />
                  security score &amp; breakdown.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">
              OWASP Issue Breakdown
            </h2>
            <OwaspBreakdown
              vulnerabilities={result?.vulnerabilities ?? []}
            />
          </div>

          <HistoryList
            sessions={history}
            selectedId={selectedId}
            onSelect={(id) => void handleSelectHistory(id)}
            onRefresh={() => void refreshHistory()}
          />
        </aside>
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-center text-[11px] text-slate-600">
        SecureLint AI · score = 100 − Σ penalty (CRITICAL 25 · HIGH 15 · MEDIUM 8
        · LOW 3 · INFO 1)
      </footer>
    </div>
  );
}
