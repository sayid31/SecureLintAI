import { useState } from "react";
import { SEVERITY_META, type Vulnerability } from "../api";
import DiffPanel from "./DiffPanel";

interface FindingListProps {
  vulnerabilities: Vulnerability[];
}

/** Daftar finding per-baris; kartu bisa dibuka untuk lihat snippet + diff fix. */
export default function FindingList({ vulnerabilities }: FindingListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (vulnerabilities.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="font-medium text-emerald-300">
          Tidak ditemukan issue 🎉
        </p>
        <p className="mt-1 text-sm text-emerald-400/70">
          Kode lolos semua rule scanner.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {vulnerabilities.map((v) => {
        const meta = SEVERITY_META[v.severity];
        const open = openId === v.id;
        return (
          <article
            key={v.id}
            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : v.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-800/50"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${meta.bg} ${meta.text}`}
                  >
                    {meta.label}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    {v.ruleId}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                    baris {v.line}
                    {v.column != null ? `:${v.column}` : ""}
                  </span>
                  <span className="truncate text-[11px] text-slate-500">
                    {v.category}
                  </span>
                </span>
                <span className="mt-1 block text-sm text-slate-200">
                  {v.message}
                </span>
              </span>
              <span className="mt-1 text-slate-500">
                {open ? "▾" : "▸"}
              </span>
            </button>

            {open && (
              <div className="border-t border-slate-800 px-4 py-3 space-y-3">
                {v.snippet && (
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">
                      Kode bermasalah
                    </p>
                    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300">
                      {v.snippet}
                    </pre>
                  </div>
                )}
                {v.suggestedFix ? (
                  <DiffPanel before={v.snippet ?? ""} after={v.suggestedFix} />
                ) : (
                  <p className="text-xs text-slate-500">
                    Tidak ada rekomendasi fix otomatis untuk rule ini.
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
