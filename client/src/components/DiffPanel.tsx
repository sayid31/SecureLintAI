import { useState } from "react";

interface DiffPanelProps {
  /** Kode sebelum fix (snippet). */
  before: string;
  /** Kode sesudah fix (suggestedFix). */
  after: string;
}

/** Diff side-by-side sederhana: merah = sebelum, hijau = sesudah. */
export default function DiffPanel({ before, after }: DiffPanelProps) {
  const [copied, setCopied] = useState(false);
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const rows = Math.max(beforeLines.length, afterLines.length);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(after);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia — abaikan */
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-slate-500">
          Rekomendasi fix
        </p>
        <button
          type="button"
          onClick={copy}
          className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-slate-700"
        >
          {copied ? "Tersalin ✓" : "Salin fix"}
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-rose-500/30">
          <p className="border-b border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-300">
            Sebelum
          </p>
          <pre className="overflow-x-auto bg-rose-950/20 p-3 font-mono text-xs leading-5 text-rose-200/90">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i}>
                {beforeLines[i] !== undefined ? beforeLines[i] : ""}
              </div>
            ))}
          </pre>
        </div>

        <div className="overflow-hidden rounded-lg border border-emerald-500/30">
          <p className="border-b border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            Sesudah
          </p>
          <pre className="overflow-x-auto bg-emerald-950/20 p-3 font-mono text-xs leading-5 text-emerald-200/90">
            {afterLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}
