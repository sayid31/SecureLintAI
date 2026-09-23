# SecureLint AI — Context / Memory

> File ini adalah memori proyek. Baca dulu sebelum melanjutkan kerja agar konteks tidak hilang antar sesi.
> Terakhir diperbarui: 2026-09-23 (update setelah DB end-to-end lulus + frontend scaffolded)

---

## 1. Gambaran Proyek

**SecureLint AI** — AI-powered Code Security & Quality Auditor dashboard.

- **Frontend:** React (Vite) + Tailwind CSS + Monaco Editor (`@monaco-editor/react`) + Recharts — ✅ **scaffolded di `/client` & teruji** (typecheck, build, dev server, proxy API)
- **Backend:** Node.js + TypeScript + Express + Prisma (PostgreSQL) — ✅ selesai & terverifikasi end-to-end
- **AI:** Provider interface dengan Mock keyword scanner (MVP), ke depan bisa swap ke OpenAI/Claude

### Fitur MVP

1. Monaco Editor untuk paste/edit kode (JS/TS/Python).
2. Backend `POST /api/audit` menerima `{ code: string, language: string, provider: 'openai' | 'claude' }`.
3. Mock AI Service: scan keyword (`eval()`, SQL concat, `password =`, `dangerouslySetInnerHTML`, dll) → anotasi vulnerability per-baris dalam format JSON ketat.
4. Penyimpanan DB (Prisma + PostgreSQL): Audit Sessions + Vulnerability items.
5. Dashboard interaktif Recharts: Security Score, OWASP Issue Breakdown, inline code diff fix recommendations.

---

## 2. Keputusan yang Sudah Diambil

| Topik | Keputusan |
|---|---|
| Database dev | **1 container Postgres dipakai bersama** (banyak database terpisah per project) — sebelumnya Docker Compose, sudah dihapus; DB `securelint` dibuat di container existing `server` (WSL Ubuntu, port 5432) |
| Host DB dari Windows | **`127.0.0.1`** (bukan `localhost`) — forwarding WSL2→Windows hanya IPv4, `localhost` bisa resolve ke `::1` → Prisma `P1001` |
| Urutan kerja | **Backend dulu** → frontend menyusul setelah API solid |
| Provider AI | Interface `AuditProvider` sudah didefinisikan; `openai`/`claude` **fall back ke mock** di MVP — tinggal ganti mapping di factory |
| Skor keamanan | `100 - Σ(severity penalty)`, clamp 0–100. Penalty: CRITICAL 25, HIGH 15, MEDIUM 8, LOW 3, INFO 1 |
| Bahasa respons user | User berkomunikasi dalam **Bahasa Indonesia** — balas dalam Bahasa Indonesia |

---

## 3. Struktur Proyek (status: backend ✅ + frontend ✅ teruji, tinggal polish/opsional)

```
SecureLint AI/                     ← working dir, BUKAN git repo
├── context.md                     ← file ini
├── README.md                      # setup + API docs + tabel rules
├── .gitignore                     # node_modules, dist, .env, *.log
├── client/                        # ✅ SUDAH DIBUAT & TERUJI (Vite + React 19 + Tailwind 4)
│   ├── package.json               # scripts: dev, build (tsc + vite), typecheck, preview
│   ├── vite.config.ts             # proxy /api → 127.0.0.1:4000 (hindari CORS), port 5173
│   ├── tsconfig.json              # strict, noEmit, bundler resolution
│   ├── index.html                 # lang="id", judul SecureLint AI
│   └── src/
│       ├── main.tsx               # React 19 createRoot + StrictMode
│       ├── index.css              # @import "tailwindcss" (Tailwind v4 via @tailwindcss/vite)
│       ├── App.tsx                # layout dashboard, state, aksi runAudit/selectHistory
│       ├── api.ts                 # tipe API + fetch client + SEVERITY_META + scoreColor
│       └── components/
│           ├── CodeEditor.tsx     # Monaco; Ctrl/Cmd+Enter via editor.addCommand (onMount)
│           ├── ScoreGauge.tsx     # donut SVG 0–100, warna hijau/amber/merah
│           ├── OwaspBreakdown.tsx # Recharts Pie per kategori OWASP, warna severity mayoritas
│           ├── FindingList.tsx    # kartu finding per-baris, accordion buka snippet + diff
│           ├── DiffPanel.tsx      # diff side-by-side merah/hijau + tombol salin fix
│           └── HistoryList.tsx    # GET /api/audits, klik → muat session
└── server/                        # ✅ SUDAH SELESAI & TERVERIFIKASI (termasuk test end-to-end DB)
    ├── .env / .env.example        # DATABASE_URL, PORT=4000, CLIENT_ORIGIN, AI_PROVIDER
    ├── package.json               # scripts: dev (tsx watch), build, prisma:*
    ├── tsconfig.json              # CommonJS, strict, outDir dist, rootDir src
    ├── prisma/schema.prisma
    └── src/
        ├── index.ts               # listen PORT 4000
        ├── app.ts                 # express + cors + json + health + 404/error handler
        ├── routes/audit.routes.ts
        ├── controllers/audit.controller.ts   # validasi Zod
        ├── services/audit.service.ts         # runAudit / getAuditById / listAudits
        ├── services/ai/
        │   ├── types.ts           # kontrak ketat: AuditProvider, AuditResult, AuditFinding
        │   ├── mock.provider.ts   # 7 rules, line-specific
        │   └── index.ts           # getProvider() factory
        └── lib/prisma.ts
```

---

## 4. Database Schema (Prisma)

- **AuditSession**: `id (cuid)`, `language`, `provider`, `code (Text)`, `securityScore (Int)`, `issueCount (Int)`, `createdAt`, relasi `vulnerabilities[]`. Index pada `createdAt`.
- **Vulnerability**: `id (cuid)`, `sessionId (FK, cascade delete)`, `ruleId`, `message (Text)`, `line`, `column?`, `endLine?`, `severity (enum)`, `category` (format OWASP, contoh `"A03:2021 - Injection"`), `snippet?`, `suggestedFix?`, `createdAt`. Index pada `sessionId`, `severity`.
- **enum Severity**: `CRITICAL | HIGH | MEDIUM | LOW | INFO`

---

## 5. API

| Method | Route | Keterangan |
|---|---|---|
| POST | `/api/audit` | Body `{ code, language, provider }` — validasi Zod, 400 jika invalid, 201 + session lengkap jika sukses |
| GET | `/api/audits` | List 20 session terbaru (bonus, di luar spesifikasi awal) |
| GET | `/api/audits/:id` | Session + vulnerabilities terurut per line; 404 jika tidak ada |
| GET | `/api/health` | `{ status: "ok", service: "securelint-ai" }` |

- `language`: `javascript | typescript | python`
- `provider`: `openai | claude` (keduanya resolve ke mock di MVP)

---

## 6. Mock AI Rules

| Rule | Severity | Deteksi | OWASP |
|---|---|---|---|
| SL-001 | CRITICAL | `eval()` | A03 Injection |
| SL-002 | CRITICAL | SQL dibangun via concat/interpolation/`f-string`/`%` (guard: harus ada `SELECT * ... WHERE` DAN bukti string-building) | A03 Injection |
| SL-003 | HIGH | Hardcoded `password/passwd/pwd/secret/api_key = "..."` | A07 Auth Failures |
| SL-004 | HIGH | `dangerouslySetInnerHTML` | A03 Injection |
| SL-005 | MEDIUM | `innerHTML =` / `document.write` | A05 Misconfiguration |
| SL-006 | HIGH | `md5(` / `sha1(` | A02 Cryptographic Failures |
| SL-007 | LOW | `console.log/debug/info` | A04 Insecure Design |

Sebagian rule punya `buildFix` → diisi ke field `suggestedFix` untuk diff rekomendasi di frontend.

---

## 7. Status Verifikasi (2026-09-23 — update kedua)

**Terverifikasi end-to-end (DB hidup):**
- ✅ Docker **ada di WSL Ubuntu** (bukan Docker Desktop): Docker 29.7.1 + Compose v5.3.1, `dockerd` aktif
- ✅ Database `securelint` dibuat di container existing `server` (postgres:15-alpine, port 5432)
- ✅ `npx prisma migrate dev --name init` **sukses** → tabel `AuditSession`, `Vulnerability`, `_prisma_migrations` + enum `Severity` + index lengkap
- ✅ `npx prisma migrate status` → *Database schema is up to date*
- ✅ `npx tsc --noEmit` bersih
- ✅ Smoke test API penuh: health 200, `POST /api/audit` valid **201** (data masuk & terbaca dari DB), invalid body/language **400** + detail Zod, `GET /api/audits` 200, `GET /api/audits/:id` 200, 404 route 404
- ✅ **Bug diperbaiki:** error handler `app.ts` selalu balas 500 → sekarang hormati `err.statusCode` (JSON malformed = 400)

**Frontend (update ketiga):**
- ✅ `client/` scaffolded manual (tanpa create-vite): React 19.3 + Vite 7.3 + Tailwind 4.3 + @monaco-editor/react 4.7 + Recharts 3.10
- ✅ `npm install` OK (128 packages); `tsc --noEmit` bersih; `npm run build` sukses (dist/ 594 kB JS — Monaco+Recharts, belum di-split)
- ✅ Dev server Vite jalan di **5173**; proxy `/api` → backend teruji: `GET /api/health` 200 & `POST /api/audit` **201** lewat 5173
- ✅ Fitur MVP terpasang: editor Monaco + pilihan bahasa/provider, tombol Audit (Ctrl+Enter), score gauge, hitungan severity, pie OWASP, finding accordion + diff sebelum/sesudah + salin fix, riwayat (klik → muat session)
- ⚠️ Catatan: `onKeyDown` TIDAK ADA di @monaco-editor/react → pakai `onMount` + `editor.addCommand(CtrlCmd+Enter)`
- ⚠️ Belum terverifikasi visual di browser (tool browser OpenCode belum connect di sesi ini)

**Bekas/known issues:**
- ⚠️ 3 high-severity npm vulnerabilities di **server** + 1 low + 1 moderate di **client** (dompurify via monaco-editor — belum ada patch rilis)
- ⚠️ Prisma warning deprecated: `package.json#prisma` seed config akan dihapus di Prisma 7 → ke depan migrasi ke `prisma.config.ts`
- ⚠️ `docker-compose.yml` **sudah dihapus** (user pilih strategi 1 container banyak database)

---

## 8. Environment / Lingkungan

- **OS:** Windows (PowerShell), path kerja: `C:\Users\Muhamad Sayid\Documents\SecureLint AI`
- Node v22.18.0, npm 10.9.3
- **Docker: terinstall DI WSL Ubuntu** (bukan Docker Desktop) — akses dari PowerShell via `wsl -d Ubuntu -- docker ...`
  - Container `server` = postgres:15-alpine, port `0.0.0.0:5432`, restart `unless-stopped`, volume `server_pgdata`
  - Kredensial: user `admin` / password `supersecretpassword`
  - Database di 1 container itu: `admin`, `ecommerce_db`, `postgres`, **`securelint`** (project ini) — project lain (`ecommerce_postgres` di 5434, `postgres` container, `portainer`) jangan disentuh
  - Dari Windows: `wsl -d Ubuntu -- docker exec server psql -U admin -d securelint`
  - ⚠️ Quoting SQL dari PowerShell ke `wsl ... psql -c` rawan hilang → pakai pipe stdin: `$sql | wsl -d Ubuntu -- docker exec -i server psql -U admin -d securelint`
- Perintah shell Windows: hindari `Start-Process npx` (harus `npx.cmd`); lebih baik pakai background shell
- Bukan git repo (belum `git init`)
- Server dev: `npm run dev` (tsx watch) di `server/`, port 4000
- Frontend dev: `npm run dev` (Vite) di `client/`, port 5173 — proxy `/api` → `127.0.0.1:4000`
- Kedua server dev bisa jalan bersamaan (2 terminal/background shell)

---

## 9. TODO Berikutnya

1. ~~Install Docker + migrate + test end-to-end~~ ✅ **SELESAI** (pakai container existing `server` di WSL Ubuntu)
2. ~~Scaffold frontend (`/client`)~~ ✅ **SELESAI** — React 19 + Vite 7 + Tailwind 4 + Monaco 4.7 + Recharts 3
3. ~~Dashboard: score gauge, OWASP pie, finding per-baris, panel diff `suggestedFix`~~ ✅ **SELESAI** (diff pakai split-view buatan sendiri, BUKAN `react-diff-view` — cukup karena `suggestedFix` = replacement per-snippet)
4. ~~Riwayat audit (`GET /api/audits`)~~ ✅ **SELESAI** — `HistoryList.tsx`, klik → muat session + isi ulang editor
5. Opsional / sisa:
   - Verifikasi visual di browser (tool browser OpenCode belum tersedia di sesi ini — buka manual `http://localhost:5173`)
   - Implementasi provider OpenAI/Claude asli (tinggal ganti mapping di `server/src/services/ai/index.ts`)
   - `git init`
   - Tangani vulnerabilities npm audit: server 3 high, client 1 low + 1 moderate (dompurify via monaco-editor, belum ada patch)
   - Migrasi seed config Prisma ke `prisma.config.ts`
   - Code-split bundle client (build 594 kB — Monaco + Recharts)
