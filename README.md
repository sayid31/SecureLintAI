# SecureLint AI

AI-powered Code Security & Quality Auditor.

## Stack

- **Frontend:** React 19 (Vite 7) + Tailwind CSS 4 + Monaco Editor + Recharts ✅
- **Backend:** Node.js, TypeScript, Express, Prisma (PostgreSQL)
- **AI:** OpenAI & Claude **asli** (perlu API key) — otomatis **fallback ke mock keyword scanner** kalau key kosong atau API error

## Dev — satu perintah (backend + frontend)

```bash
npm install   # sekali saja di root (memasang concurrently)
npm run dev   # backend :4000 + frontend :5173 sekaligus
```

- Log di-tag `[server]` (biru) & `[client]` (hijau) dalam **satu terminal** — `Ctrl+C` mematikan keduanya.
- Kalau salah satu crash, yang lain ikut dimatikan (`--kill-others-on-fail`).
- Script lain: `npm run dev:server`, `npm run dev:client`, `npm run build`, `npm run typecheck`.
- Buka **http://localhost:5173** (proxy `/api` → `127.0.0.1:4000`, tanpa CORS).
  ⚠️ Vite listen di `::1` (IPv6) — akses lewat `localhost`, **bukan** `http://127.0.0.1:5173`.

> Perlu install dependency per paket dulu bila belum: `npm install` di `server/` dan `client/`.

## Getting started (frontend)

```bash
# Terminal terpisah dari backend — dev server http://localhost:5173
cd client
npm install
npm run dev
```

- Proxy `/api` → `http://127.0.0.1:4000` sudah dikonfigurasi di `vite.config.ts` (tanpa CORS).
- Fitur: Monaco editor (JS/TS/Python), tombol **Jalankan Audit** (atau `Ctrl+Enter`), Security
  Score gauge, hitungan per-severity, pie OWASP breakdown, daftar finding per-baris
  (klik untuk snippet + diff sebelum/sesudah), riwayat audit (klik untuk muat session lama).
- Build produksi: `npm run build` → `client/dist/` (code-split: index/recharts/monaco + workers).

## Getting started (backend)

PostgreSQL berjalan di **container `server` (WSL Ubuntu)** — satu container dipakai bersama,
database terpisah per project (`securelint`). Pastikan container sudah up:

```bash
# 0. Pastikan Docker (di WSL Ubuntu) & container Postgres running
wsl -d Ubuntu -- docker ps   # container "server" harus Up, port 5432
```

```bash
# 1. Install & migrate (buat database dulu bila belum ada:
#    wsl -d Ubuntu -- docker exec server createdb -U admin securelint)
cd server
npm install
npx prisma migrate dev --name init

# 2. Run dev server (http://localhost:4000)
npm run dev
```

> **Catatan `127.0.0.1`:** `DATABASE_URL` di `server/.env` memakai `127.0.0.1`, bukan
> `localhost`. Forwarding WSL2 → Windows hanya lewat IPv4; `localhost` bisa resolve ke
> `::1` (IPv6) dan memicu error Prisma `P1001`.
>
> **Catatan `prisma.config.ts`:** begitu file ini ada, Prisma berhenti auto-load `.env`
> — maka `import "dotenv/config"` ditambahkan di config dan di `src/index.ts`.

## API

| Method | Route            | Body / Params                              |
| ------ | ---------------- | ------------------------------------------ |
| POST   | `/api/audit`     | `{ code, language, provider }`             |
| GET    | `/api/audits`    | — (recent sessions)                        |
| GET    | `/api/audits/:id`| — (session + vulnerabilities)              |
| GET    | `/api/health`    | —                                          |

`language`: `javascript` | `typescript` | `python`
`provider`: `openai` | `claude` | `mock` (default UI: `mock` — scanner dummy, tanpa API key)

### Example

```bash
curl -X POST http://localhost:4000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"code":"const p = \"password = hunter2\";","language":"javascript","provider":"openai"}'
```

## AI providers (env di `server/.env`)

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `OPENAI_API_KEY` | *(kosong)* | Kosong → provider `openai` fallback ke mock |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model Chat Completions |
| `ANTHROPIC_API_KEY` | *(kosong)* | Kosong → provider `claude` fallback ke mock |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Model Messages API |

Perilaku fallback (lihat `server/src/services/ai/index.ts`):

- Key kosong **atau** error runtime (401, timeout, respons tidak valid JSON) → log
  warning, hasil diambil dari **mock scanner**, dan `session.provider` di DB dicatat
  **jujur** (`mock`) sesuai provider yang benar-benar menghasilkan findings.
- Respons LLM divalidasi Zod ketat (`llm.shared.ts`) → findings di-sort per baris,
  skor dihitung ulang dengan formula resmi proyek.

## Mock AI rules (fallback scanner)

| Rule   | Severity | Detects                                        | OWASP |
| ------ | -------- | ---------------------------------------------- | ----- |
| SL-001 | CRITICAL | `eval()`                                       | A03 |
| SL-002 | CRITICAL | SQL built via concatenation/interpolation      | A03 |
| SL-003 | HIGH     | Hardcoded password/secret/api key              | A07 |
| SL-004 | HIGH     | `dangerouslySetInnerHTML`                      | A03 |
| SL-005 | MEDIUM   | `innerHTML =` / `document.write`               | A05 |
| SL-006 | HIGH     | `md5()` / `sha1()`                             | A02 |
| SL-007 | LOW      | `console.log/debug/info` left in code          | A04 |

Security score = `100 - Σ(severity penalty)`, clamped to 0–100
(CRITICAL 25, HIGH 15, MEDIUM 8, LOW 3, INFO 1 — lihat `server/src/services/ai/scoring.ts`).
