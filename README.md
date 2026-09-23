# SecureLint AI

AI-powered Code Security & Quality Auditor.

## Stack

- **Frontend:** React (Vite) + Tailwind CSS 4 + Monaco Editor + Recharts ✅ *(scaffolded, MVP jalan)*
- **Backend:** Node.js, TypeScript, Express, Prisma (PostgreSQL)
- **AI:** Provider interface with a deterministic Mock keyword scanner (MVP)

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
- Build produksi: `npm run build` → `client/dist/`.

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

## API

| Method | Route            | Body / Params                              |
| ------ | ---------------- | ------------------------------------------ |
| POST   | `/api/audit`     | `{ code, language, provider }`             |
| GET    | `/api/audits`    | — (recent sessions)                        |
| GET    | `/api/audits/:id`| — (session + vulnerabilities)              |
| GET    | `/api/health`    | —                                          |

`language`: `javascript` | `typescript` | `python`
`provider`: `openai` | `claude` *(both resolve to the mock scanner in MVP)*

### Example

```bash
curl -X POST http://localhost:4000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"code":"const p = \"password = hunter2\";","language":"javascript","provider":"openai"}'
```

## Mock AI rules

| Rule   | Severity | Detects                                        | OWASP |
| ------ | -------- | ---------------------------------------------- | ----- |
| SL-001 | CRITICAL | `eval()`                                       | A03 |
| SL-002 | CRITICAL | SQL built via concatenation/interpolation      | A03 |
| SL-003 | HIGH     | Hardcoded password/secret/api key              | A07 |
| SL-004 | HIGH     | `dangerouslySetInnerHTML`                      | A03 |
| SL-005 | MEDIUM   | `innerHTML =` / `document.write`               | A05 |
| SL-006 | HIGH     | `md5()` / `sha1()`                             | A02 |
| SL-007 | LOW      | `console.log/debug/info` left in code          | A04 |

Security score = `100 - Σ(severity penalty)`, clamped to 0–100.
