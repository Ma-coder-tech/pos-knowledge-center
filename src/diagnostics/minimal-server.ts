import { serve } from "@hono/node-server";
import { Hono } from "hono";

const startedAt = performance.now();
const port = Number(process.env.DIAG_PORT ?? 3100);

const app = new Hono();

app.get("/health", (context) =>
  context.json({
    ok: true,
    diagnostic: "minimal-server",
  }),
);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    const elapsedMs = (performance.now() - startedAt).toFixed(2);
    console.log(`[diag:minimal] listening on http://localhost:${info.port}/health in ${elapsedMs}ms`);
  },
);
