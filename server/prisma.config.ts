// Konfigurasi Prisma (pengganti package.json#prisma yang deprecated di Prisma 7).
// CATATAN: begitu file ini ada, Prisma TIDAK lagi auto-load .env → load manual di sini.
import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
