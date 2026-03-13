import { serve } from "@hono/node-server";
import { createApp } from "./http/app";

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`API listening on http://localhost:${info.port}`);
  },
);

