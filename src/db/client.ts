import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize the database client.");
}

const databaseDiagnosticsEnabled = process.env.DB_STARTUP_TIMING === "1";
const formatElapsed = (startedAt: number) => `${(performance.now() - startedAt).toFixed(2)}ms`;

if (databaseDiagnosticsEnabled) {
  const url = new URL(connectionString);
  const port = url.port || "5432";
  const database = url.pathname.replace(/^\//, "");
  console.log(`[diag:db] target=${url.hostname}:${port}/${database}`);
}

const clientStartedAt = databaseDiagnosticsEnabled ? performance.now() : 0;
const client = postgres(connectionString, {
  prepare: false,
});

if (databaseDiagnosticsEnabled) {
  console.log(`[diag:db] postgres client initialized in ${formatElapsed(clientStartedAt)}`);
}

export const db = drizzle(client);
export type Database = typeof db;
export const sql = client;

export async function probeDatabaseConnection(label = "manual") {
  const startedAt = performance.now();

  const [row] = await client<{ ok: number }[]>`select 1 as ok`;

  console.log(`[diag:db] ${label} first query finished in ${formatElapsed(startedAt)}`);

  return row?.ok ?? null;
}

export const databaseStartupProbe = databaseDiagnosticsEnabled
  ? probeDatabaseConnection("startup").catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[diag:db] startup query failed: ${message}`);
      throw error;
    })
  : null;
