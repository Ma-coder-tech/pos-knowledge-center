import { Hono } from "hono";
import { createTenantSchema } from "../../api/contracts";
import type { Database } from "../../db/client";
import { parseJson } from "../../lib/http";
import { createTenant, listTenants } from "../../repositories/tenants";
import type { AppBindings } from "../middleware";

export function createTenantsRouter(database: Database) {
  const router = new Hono<AppBindings>();

  router.get("/", async (context) => {
    const tenants = await listTenants(database);
    return context.json({ tenants });
  });

  router.post("/", async (context) => {
    const input = await parseJson(context, createTenantSchema);
    const tenant = await createTenant(database, input);
    return context.json({ tenant }, 201);
  });

  return router;
}

