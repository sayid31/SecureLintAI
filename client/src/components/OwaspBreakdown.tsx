import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Severity, Vulnerability } from "../api";
import { SEVERITY_META } from "../api";

interface CategorySlice {
  /** Label pendek untuk legend, contoh "A03 · Injection". */
  name: string;
  /** Kategori OWASP lengkap untuk tooltip. */
  category: string;
  value: number;
  /** Severity mayoritas di kategori ini (untuk warna). */
  topSeverity: Severity;
}

const PALETTE = ["#f43f5e", "#f97316", "#f59e0b", "#0ea5e9", "#22c55e", "#a855f7", "#14b8a6"];

function shortName(category: string): string {
  const [code, label] = category.split(" - ");
  const shortCode = code.split(":")[0] ?? code;
  return label ? `${shortCode} · ${label}` : shortCode;
}

interface OwaspBreakdownProps {
  vulnerabilities: Vulnerability[];
}

/** Pie chart: jumlah issue per kategori OWASP, warna dari severity mayoritas. */
export default function OwaspBreakdown({ vulnerabilities }: OwaspBreakdownProps) {
  if (vulnerabilities.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-500">
        Belum ada issue — jalankan audit.
      </div>
    );
  }

  const byCategory = new Map<string, Vulnerability[]>();
  for (const v of vulnerabilities) {
    const bucket = byCategory.get(v.category);
    if (bucket) bucket.push(v);
    else byCategory.set(v.category, [v]);
  }

  const severityRank: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  };

  const data: CategorySlice[] = [...byCategory.entries()].map(
    ([category, items]) => {
      const topSeverity = [...items].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity]
      )[0].severity;
      return {
        name: shortName(category),
        category,
        value: items.length,
        topSeverity,
      };
    }
  );

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
            stroke="#0f172a"
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.category}
                fill={SEVERITY_META[entry.topSeverity].hex || PALETTE[i % PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
            }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={(value, _name, entry) => [
              `${value} issue`,
              (entry?.payload as CategorySlice | undefined)?.category ?? "",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
