import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

// Prisma 7 configuration: move connection URL from schema.prisma to this file.
// https://pris.ly/d/config-datasource
export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  // @ts-expect-error -- `migrate` property is available at runtime in Prisma 7.7 but not yet reflected in types
  migrate: {
    adapter(env: Record<string, string | undefined>) {
      const connectionString = env.DATABASE_URL;
      if (!connectionString) throw new Error("DATABASE_URL is not set");
      return new PrismaPg({ connectionString });
    },
  },
});
