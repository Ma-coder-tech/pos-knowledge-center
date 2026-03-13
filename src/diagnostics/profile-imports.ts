type TimingResult = {
  label: string;
  elapsedMs: number;
};

const results: TimingResult[] = [];

async function timeStep<T>(label: string, work: () => Promise<T> | T) {
  const startedAt = performance.now();

  try {
    const value = await work();
    const elapsedMs = performance.now() - startedAt;
    results.push({ label, elapsedMs });
    console.log(`[diag:imports] ${label}: ${elapsedMs.toFixed(2)}ms`);
    return value;
  } catch (error) {
    const elapsedMs = performance.now() - startedAt;
    console.error(`[diag:imports] ${label}: failed after ${elapsedMs.toFixed(2)}ms`);
    throw error;
  }
}

const startedAt = performance.now();

await timeStep("dependency: hono", () => import("hono"));
await timeStep("dependency: @hono/node-server", () => import("@hono/node-server"));
await timeStep("dependency: zod", () => import("zod"));
await timeStep("dependency: postgres", () => import("postgres"));
await timeStep("dependency: drizzle-orm/pg-core", () => import("drizzle-orm/pg-core"));
await timeStep("dependency: drizzle-orm/postgres-js", () => import("drizzle-orm/postgres-js"));

await timeStep("module: domain/constants", () => import("../domain/constants.ts"));
await timeStep("module: api/contracts", () => import("../api/contracts.ts"));
await timeStep("module: db/schema/base", () => import("../db/schema/base.ts"));
await timeStep("module: db/schema/core", () => import("../db/schema/core.ts"));
await timeStep("module: db/schema/catalog", () => import("../db/schema/catalog.ts"));
await timeStep("module: db/schema/content", () => import("../db/schema/content.ts"));
await timeStep("module: db/schema/support", () => import("../db/schema/support.ts"));
await timeStep("module: db/client", () => import("../db/client.ts"));
await timeStep("module: lib/errors", () => import("../lib/errors.ts"));
await timeStep("module: lib/http", () => import("../lib/http.ts"));
await timeStep("module: http/middleware", () => import("../http/middleware.ts"));
await timeStep("module: http/routes/tenants", () => import("../http/routes/tenants.ts"));
await timeStep("module: http/routes/catalog", () => import("../http/routes/catalog.ts"));
await timeStep("module: http/routes/content", () => import("../http/routes/content.ts"));
await timeStep("module: http/routes/solved-issues", () => import("../http/routes/solved-issues.ts"));

const appModule = await timeStep("module: http/app", () => import("../http/app.ts"));

await timeStep("runtime: createApp()", () => {
  appModule.createApp();
});

const totalElapsedMs = performance.now() - startedAt;

console.log("[diag:imports] summary");
for (const result of results) {
  console.log(`- ${result.label}: ${result.elapsedMs.toFixed(2)}ms`);
}
console.log(`[diag:imports] total: ${totalElapsedMs.toFixed(2)}ms`);
