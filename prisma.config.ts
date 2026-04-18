import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

// Prisma 7 configuration: move connection URL from schema.prisma to this file.
// https://pris.ly/d/config-datasource
//
// DATABASE_URL  → pooler URL (PgBouncer, used at runtime by the app)
// DIRECT_URL    → direct connection (used by Prisma CLI for migrations/push/seed)
//                 Required for Supabase: pooler (port 6543) doesn't support DDL.
export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // CLI uses DIRECT_URL for reliable introspection; app runtime uses DATABASE_URL via lib/prisma.ts
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
  // @ts-expect-error -- `migrate` property is available at runtime in Prisma 7.7 but not yet reflected in types
  migrate: {
    adapter(env: Record<string, string | undefined>) {
      const connectionString = env.DIRECT_URL ?? env.DATABASE_URL;
      if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is not set");
      return new PrismaPg({ connectionString });
    },
  },
});
