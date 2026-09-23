# SecureLint AI — Context / Memory

> File ini adalah memori proyek. Baca dulu sebelum melanjutkan kerja agar konteks tidak hilang antar sesi.
> Terakhir diperbarui: 2026-09-23 (update keenam: dev satu perintah `npm run dev` — sebelumnya: provider `mock` eksplisit default untuk test)

---

## 1. Gambaran Proyek

**SecureLint AI** — AI-powered Code Security & Quality Auditor dashboard.

- **Frontend:** React (Vite) + Tailwind CSS + Monaco Editor (`@monaco-editor/react`) + Recharts — ✅ **scaffolded di `/client` & teruji** (typecheck, build, dev server, proxy API)
- **Backend:** Node.js + TypeScript + Express + Prisma (PostgreSQL) — ✅ selesai & terverifikasi end-to-end
- **AI:** **OpenAI & Claude ASLI** (via API key di `.env`) dengan **otomatis fallback ke mock keyword scanner** kalau key kosong / API error — `session.provider` di DB selalu jujur (mock bila hasil mock). ⚠️ Key belum diisi & user menunda → untuk test sekarang pakai **`mock` eksplisit** (default dropdown UI)

### Fitur MVP

1. Monaco Editor untuk paste/edit kode (JS/TS/Python).
2. Backend `POST /api/audit` menerima `{ code: string, language: string, provider: 'openai' | 'claude' | 'mock' }` — `mock` = AI dummy untuk test (default UI).
3. AI service: LLM asli (OpenAI/Anthropic) ATAU mock keyword scanner (`eval()`, SQL concat, `password =`, `dangerouslySetInnerHTML`, dll) → anotasi vulnerability per-baris dalam format JSON ketat (validasi Zod).
4. Penyimpanan DB (Prisma + PostgreSQL): Audit Sessions + Vulnerability items.
5. Dashboard interaktif Recharts: Security Score, OWASP Issue Breakdown, inline code diff fix recommendations.

---

## 2. Keputusan yang Sudah Diambil

| Topik | Keputusan |
|---|---|
| Database dev | **1 container Postgres dipakai bersama** (banyak database terpisah per project) — Docker Compose dihapus; DB `securelint` dibuat di container existing `server` (WSL Ubuntu, port 5432) |
| Host DB dari Windows | **`127.0.0.1`** (bukan `localhost`) — forwarding WSL2→Windows hanya IPv4, `localhost` bisa resolve ke `::1` → Prisma `P1001` |
| Urutan kerja | **Backend dulu** → frontend menyusul setelah API solid |
| Provider AI | **LLM asli + fallback otomatis ke mock** — `getProvider()` membungkus primary dengan `FallbackProvider`; kalau key kosong/401/timeout/JSON invalid → mock, dan `provider.name` getter melaporkan nama jujur (`mock`) yang dibaca service SETELAH `audit()` |
| Skor keamanan | `100 - Σ(severity penalty)`, clamp 0–100. Penalty: CRITICAL 25, HIGH 15, MEDIUM 8, LOW 3, INFO 1 — **satu sumber**: `server/src/services/ai/scoring.ts` (dipakai mock + LLM) |
| npm audit | **Pakai `overrides`** — `deepmerge-ts ^8.0.2` (server) & `dompurify ^3.4.15` (client); keduanya dipin exact oleh parent → `npm audit fix` tidak bisa menembus. **Hasil: 0 vulnerabilities kedua package** ✅ (Prisma CLI divalidasi tetap jalan setelah override) |
| Prisma config | **`server/prisma.config.ts`** menggantikan `package.json#prisma` (deprecated Prisma 7). ⚠️ Efek samping: Prisma berhenti auto-load `.env` → `import "dotenv/config"` ditambahkan di config & di `src/index.ts` |
| Env runtime | Server **wajib `dotenv`** (dulu tidak ada → API key tak terbaca) |
| Version control | **`git init` SUDAH JALAN** — commit pertama `b166398` (39 file). `.env`/`node_modules`/`dist` ter-ignore. **Remote: `origin` → https://github.com/sayid31/SecureLintAI.git — SUDAH DI-PUSH** (branch `master`, auth via Git Credential Manager) |
| Bahasa respons user | User berkomunikasi dalam **Bahasa Indonesia** — balas dalam Bahasa Indonesia |

---

## 3. Struktur Proyek (status: SEMUA MVP SELESAI)

```
SecureLint AI/                     ← git repo (commit b166398)
├── context.md                     ← file ini
├── package.json                   # ← root dev runner: `npm run dev` (concurrently)
├── package-lock.json
├── README.md                      # setup + API docs + tabel rules + AI provider env
├── .gitignore                     # node_modules, dist, .env, *.log
├── client/                        # ✅ React 19 + Vite 7 + Tailwind 4 (0 npm vulns)
│   ├── package.json               # scripts: dev/build/typecheck; overrides: dompurify ^3.4.15
│   ├── vite.config.ts             # proxy /api → 127.0.0.1:4000, port 5173, manualChunks
│   ├── tsconfig.json / index.html
│   └── src/
│       ├── main.tsx / index.css / App.tsx / api.ts
│       └── components/            # CodeEditor, ScoreGauge, OwaspBreakdown,
│                                  # FindingList, DiffPanel, HistoryList
└── server/                        # ✅ Express + TS + Prisma (0 npm vulns)
    ├── .env / .env.example        # DATABASE_URL(127.0.0.1), PORT, CLIENT_ORIGIN,
    │                              # OPENAI_API_KEY/MODEL, ANTHROPIC_API_KEY/MODEL
    ├── package.json               # scripts dev/build/prisma:*; overrides: deepmerge-ts ^8.0.2
    ├── prisma.config.ts           # ← pengganti package.json#prisma; import "dotenv/config" WAJIB
    ├── prisma/schema.prisma + migrations/20260923032358_init
    └── src/
        ├── index.ts               # import "dotenv/config" PERTAMA → listen PORT 4000
        ├── app.ts                 # express + cors + json + health + 404/error handler
        │                          # (error handler hormati err.statusCode — bug 500 diperbaiki)
        ├── routes/audit.routes.ts
        ├── controllers/audit.controller.ts   # validasi Zod
        ├── services/audit.service.ts         # runAudit / getAuditById / listAudits
        ├── services/ai/
        │   ├── types.ts           # kontrak ketat: AuditProvider, AuditResult, AuditFinding
        │   ├── scoring.ts         # SEVERITY_PENALTY + computeSecurityScore (SHARED)
        │   ├── mock.provider.ts   # 7 rules, line-specific (pakai scoring.ts)
        │   ├── llm.shared.ts      # SYSTEM_PROMPT + extractJson + Zod normalizeResult
        │   ├── openai.provider.ts # Chat Completions (gpt-4o-mini), response_format json
        │   ├── claude.provider.ts # Messages API (claude-sonnet-4-5)
        │   └── index.ts           # getProvider() + FallbackProvider (honest name)
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
| GET | `/api/audits` | List 20 session terbaru |
| GET | `/api/audits/:id` | Session + vulnerabilities terurut per line; 404 jika tidak ada |
| GET | `/api/health` | `{ status: "ok", service: "securelint-ai" }` |

- `language`: `javascript | typescript | python`
- `provider`: `openai | claude | mock` — **`mock` = AI dummy, pilihan default UI untuk test** (ditambahkan 2026-09-23; sebelumnya `mock` by design = 400 → **keputusan berubah**). `openai`/`claude` tanpa key → fallback otomatis ke mock, **di DB**: `mock` (lihat §2 Provider AI)

---

## 6. Mock AI Rules (fallback scanner)

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
LLM asli memakai prompt di `llm.shared.ts` (ruleId `AI-xxx`, kategori OWASP 2021, skor dihitung ulang oleh `scoring.ts` supaya konsisten).

---

## 7. Status Verifikasi (2026-09-23 — update keenam: dev satu perintah)

**Update keenam (2026-09-23 — root dev runner):**
- ✅ `package.json` root dibuat: `npm run dev` → `concurrently -n server,client --kill-others-on-fail "npm --prefix server run dev" "npm --prefix client run dev"` (+ `dev:server`, `dev:client`, `build`, `typecheck`); devDep `concurrently@9` (25 packages, 0 vulns)
- ✅ Bug ditemukan & diperbaiki: flag `--default-target-terminal` **tanpa value mengonsumsi argumen pertama** → command `[server]` menjalankan client & backend tidak start. Dihapus → normal
- ✅ Test E2E satu perintah: backend `listening :4000` + Vite `ready :5173` bersamaan; via proxy `localhost:5173`: health OK, `POST /api/audit` **201** (mock, score 32), `GET /api/audits` OK
- ⚠️ Vite ternyata listen **IPv4-only tidak ada — hanya `::1`** → `http://127.0.0.1:5173` gagal, `http://localhost:5173` OK (buka yang ini)
- 📝 README: section "Dev — satu perintah" ditambahkan
- ✅ **Fix console error 404:** `index.html` tidak punya icon → browser minta `/favicon.ico` (404). Dibuat `client/public/favicon.svg` (shield emerald) + `<link rel="icon">` → verified 200, console bersih
- ⚠️ Tool browser OpenCode **tetap belum connect** di sesi ini (`browser.disconnected` — perlu desktop app + experimental setting) → verifikasi visual via browser manual di `http://localhost:5173`

**Update kelima (2026-09-23 — provider mock eksplisit):**
- ✅ Keputusan user: **aktivasi LLM asli (TODO 2) ditunda** — API key belum bisa diisi, test pakai AI dummy saja
- ✅ Controller: `provider: z.enum(["openai", "claude", "mock"])` — sebelumnya `mock` = 400 by design, **keputusan berubah** (user pilih "Mock eksplisit")
- ✅ Frontend: tipe `Provider` di `api.ts` + dropdown `App.tsx` dapat opsi **"Mock (Dummy AI)"**, jadi **default**; hint di bawah tombol Audit disesuaikan
- ✅ README: dokumentasi enum `provider` diperbarui
- ✅ Test E2E: `mock` → 201 recorded `mock`; `openai`/`claude` (key kosong) → fallback recorded `mock`; `gpt5` (invalid) → 400; `GET /api/audits` OK (session masuk)
- ✅ `npx tsc --noEmit` server & `npm run typecheck` client bersih

**Update keempat (hardening + opsional selesai):**
- ✅ **npm audit: 0 vulnerabilities** di server & client (via `overrides`: deepmerge-ts 8.0.2, dompurify 3.4.15) — Prisma CLI (`validate`/`migrate status`/`generate`) divalidasi tetap jalan setelah override
- ✅ **`prisma.config.ts`** dibuat + `package.json#prisma` dihapus → warning deprecated Prisma 7 hilang; `dotenv/config` ditambahkan di config karena Prisma berhenti auto-load `.env` (diuji: `injected env (8) dari .env`, schema valid, migrasi up to date)
- ✅ **`dotenv`** ditambahkan ke server + `import "dotenv/config"` di `src/index.ts` (API key akhirnya terbaca)
- ✅ **Provider AI asli**: `openai.provider.ts` (gpt-4o-mini) + `claude.provider.ts` (claude-sonnet-4-5) + shared `scoring.ts` + `llm.shared.ts` (prompt ketat, `extractJson`, Zod normalize) + `FallbackProvider` di factory
- ✅ **Test E2E fallback**:
  - key kosong → 201, log `[ai] openai gagal (OPENAI_API_KEY belum di-set) → fallback ke mock`, DB `provider=mock`
  - key dummy → API OpenAI **nyata balas 401** → catch → fallback → `RESULT name=mock` (path runtime error teruji, jaringan keluar OK)
  - `provider=mock` di body → 400 (Zod by design) — ⚠️ **sudah tidak berlaku**, lihat Update kelima
- ✅ **Code-split client**: index 226 kB (dari 594), recharts 343, monaco 22 + workers terpisah
- ✅ **`git init` + commit pertama `b166398`** (39 file; `.env`/node_modules/dist ter-verify tidak ikut)
- ✅ `npx tsc --noEmit` server & `npm run typecheck` client bersih setelah semua perubahan

**Update sebelumnya (tetap berlaku):**
- ✅ Docker di WSL Ubuntu; DB `securelint` di container `server`; migrate sukses; smoke test API penuh (201/400/404/200)
- ✅ Bug error handler 500→400 diperbaiki; frontend scaffolded & teruji; proxy Vite→backend OK

**Sisa known issues (minor):**
- ⚠️ Belum verifikasi visual di browser (tool browser OpenCode tidak connect — buka manual `http://localhost:5173`)
- ⚠️ `docker-compose.yml` sudah dihapus (keputusan user: 1 container banyak database)
- ~~⚠️ Belum `git push` ke remote~~ ✅ **SUDAH PUSH** — `origin/master` (repo `sayid31/SecureLintAI`)

---

## 8. Environment / Lingkungan

- **OS:** Windows (PowerShell), path kerja: `C:\Users\Muhamad Sayid\Documents\SecureLint AI`
- Node v22.18.0, npm 10.9.3
- **Git:** repo aktif, config global `Sayid_Dev31 <muhamadsayidamanulloh@gmail.com>`; remote `origin` = `https://github.com/sayid31/SecureLintAI.git` (sudah push, branch `master`)
- **Docker: terinstall DI WSL Ubuntu** (bukan Docker Desktop) — akses via `wsl -d Ubuntu -- docker ...`
  - Container `server` = postgres:15-alpine, port `0.0.0.0:5432`, restart `unless-stopped`, volume `server_pgdata`
  - Kredensial: user `admin` / password `supersecretpassword`
  - Database di 1 container itu: `admin`, `ecommerce_db`, `postgres`, **`securelint`** (project ini) — project lain (`ecommerce_postgres` di 5434, `postgres`, `portainer`) jangan disentuh
  - Dari Windows: `wsl -d Ubuntu -- docker exec server psql -U admin -d securelint`
  - ⚠️ Quoting SQL dari PowerShell ke `wsl ... psql -c` rawan hilang → pipe stdin: `$sql | wsl -d Ubuntu -- docker exec -i server psql -U admin -d securelint`
- Perintah shell Windows: hindari `Start-Process npx` (harus `npx.cmd`); lebih baik pakai background shell
- **API key AI BELUM diisi** (`server/.env` masih `""`) → provider openai/claude selalu fallback ke mock; **UI sekarang default `mock` eksplisit** (AI dummy) untuk test. User tinggal isi key + pilih OpenAI/Claude untuk LLM asli (restart backend setelah edit `.env`)
- **Dev satu perintah (root):** `npm install` (sekali) lalu **`npm run dev`** → backend (`tsx watch`, :4000) + frontend (Vite, :5173) bersamaan via `concurrently`, log tag `[server]`/`[client]`, Ctrl+C matikan keduanya. Alternatif: `npm run dev:server` / `npm run dev:client`
- Server dev: `npm run dev` (tsx watch) di `server/`, port 4000
- Frontend dev: `npm run dev` (Vite) di `client/`, port 5173 — proxy `/api` → `127.0.0.1:4000`
- ⚠️ Vite listen **hanya di `::1` (IPv6)** → buka `http://localhost:5173`, `http://127.0.0.1:5173` GAGAL (sudah diuji)
- ⚠️ Server restart mematikan background shell — start ulang 2 shell (server + client) kalau mati
- ⚠️ `prisma generate` EPERM kalau backend masih jalan (query engine DLL dikunci) → stop backend dulu

---

## 9. Status TODO — SEMUA TASK MVP SELESAI ✅

1. ~~Install Docker + migrate + test end-to-end~~ ✅
2. ~~Scaffold frontend (`/client`)~~ ✅
3. ~~Dashboard: score gauge, OWASP pie, finding per-baris, panel diff `suggestedFix`~~ ✅ (split-view buatan sendiri, tanpa `react-diff-view`)
4. ~~Riwayat audit (`GET /api/audits`)~~ ✅
5. ~~Provider OpenAI/Claude asli + fallback~~ ✅
6. ~~`git init` + commit~~ ✅ (`b166398`)
7. ~~Tangani npm audit (server 3 high + client 1 low + 1 moderate)~~ ✅ **0 vulnerabilities**
8. ~~Migrasi seed config Prisma ke `prisma.config.ts`~~ ✅
9. ~~Code-split bundle client~~ ✅ (index 226 kB)

**Backlog / langkah lanjutan (di luar MVP):**
- **Sudah selesai:** dev satu perintah `npm run dev` (root, via concurrently)
- Verifikasi visual manual di `http://localhost:5173`
- **Ditunda user:** isi `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` di `server/.env` → restart backend → audit LLM asli (kode provider sudah siap; sementara test pakai `mock`)
- ✅ **`git push` ke https://github.com/sayid31/SecureLintAI.git** (branch `master`, commit `0a025c8`)
- Opsional: seed sample data, tests (vitest/jest), rate limiting, auth
