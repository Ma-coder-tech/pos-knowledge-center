import { Hono } from "hono";
import {
  createDeviceModelSchema,
  createGlossaryTermSchema,
  createModuleSchema,
  createProductSchema,
  createReleaseVersionSchema,
} from "../../api/contracts";
import type { Database } from "../../db/client";
import { parseJson } from "../../lib/http";
import {
  createDeviceModel,
  createGlossaryTerm,
  createModule,
  createProduct,
  createReleaseVersion,
  getCatalog,
} from "../../repositories/catalog";
import type { AppBindings } from "../middleware";

export function createCatalogRouter(database: Database) {
  const router = new Hono<AppBindings>();

  router.get("/catalog", async (context) => {
    const catalog = await getCatalog(database, context.get("tenantId"));
    return context.json(catalog);
  });

  router.post("/products", async (context) => {
    const input = await parseJson(context, createProductSchema);
    const product = await createProduct(database, context.get("tenantId"), input);
    return context.json({ product }, 201);
  });

  router.post("/modules", async (context) => {
    const input = await parseJson(context, createModuleSchema);
    const module = await createModule(database, context.get("tenantId"), input);
    return context.json({ module }, 201);
  });

  router.post("/device-models", async (context) => {
    const input = await parseJson(context, createDeviceModelSchema);
    const deviceModel = await createDeviceModel(database, context.get("tenantId"), input);
    return context.json({ deviceModel }, 201);
  });

  router.post("/release-versions", async (context) => {
    const input = await parseJson(context, createReleaseVersionSchema);
    const releaseVersion = await createReleaseVersion(database, context.get("tenantId"), input);
    return context.json({ releaseVersion }, 201);
  });

  router.post("/glossary-terms", async (context) => {
    const input = await parseJson(context, createGlossaryTermSchema);
    const glossaryTerm = await createGlossaryTerm(database, context.get("tenantId"), input);
    return context.json({ glossaryTerm }, 201);
  });

  return router;
}

