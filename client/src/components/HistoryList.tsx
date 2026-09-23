import type { AuditSession } from "../api";
import { scoreColor } from "../api";

interface HistoryListProps {
  sessions: AuditSession[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const menit = Math.floor(diff / 60_000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} mnt lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

/** Riwayat audit (GET /api/audits) — klik untuk muat ulang session. */
export default function HistoryList({
  sessions,
  selectedId,
  onSelect,
  onRefresh,
}: HistoryListProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Riwayat Audit
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
        >
          Muat ulang
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          Belum ada audit tersimpan.
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto">
          {sessions.map((s) => {
            const active = s.id === selectedId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`flex w-full items-center gap-3 border-b border-slate-800/70 px-4 py-2.5 text-left transition last:border-b-0 hover:bg-slate-800/50 ${
                    active ? "bg-slate-800/70" : ""
                  }`}
                >
                  <span
                    className="w-9 shrink-0 text-center text-sm font-bold tabular-nums"
                    style={{ color: scoreColor(s.securityScore) }}
                  >
                    {s.securityScore}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-slate-300">
                      {s.language} · {s.issueCount} issue
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {timeAgo(s.createdAt)}
                    </span>
                  </span>
                  {s.issueCount > 0 && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
