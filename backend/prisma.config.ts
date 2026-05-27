import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    // Supabase: dùng DIRECT_URL (port 5432) cho migrate, không dùng pooler
    url: env("DIRECT_URL"),
  },
});
