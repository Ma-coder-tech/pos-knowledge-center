process.env.DB_STARTUP_TIMING = "1";

const startedAt = performance.now();

const { databaseStartupProbe, probeDatabaseConnection, sql } = await import("../db/client.ts");

try {
  if (databaseStartupProbe) {
    await databaseStartupProbe;
  } else {
    await probeDatabaseConnection("manual");
  }

  console.log(`[diag:db] total diagnostic finished in ${(performance.now() - startedAt).toFixed(2)}ms`);
} finally {
  await sql.end({ timeout: 0 });
}
