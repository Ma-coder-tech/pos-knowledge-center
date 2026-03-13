import { Hono } from "hono";
import {
  contentFilterSchema,
  createContentSchema,
  upsertContentVersionSchema,
} from "../../api/contracts";
import type { Database } from "../../db/client";
import { parseJson, parseQuery } from "../../lib/http";
import {
  createContent,
  createContentVersion,
  getContentById,
  listContent,
} from "../../repositories/content";
import { AppError } from "../../lib/errors";
import type { AppBindings } from "../middleware";

export function createContentRouter(database: Database) {
  const router = new Hono<AppBindings>();

  router.get("/content", async (context) => {
    const filters = parseQuery(context, contentFilterSchema);
    const items = await listContent(database, context.get("tenantId"), filters);
    return context.json({
      items,
      nextCursor: null,
    });
  });

  router.post("/content", async (context) => {
    const input = await parseJson(context, createContentSchema);
    const result = await createContent(database, context.get("tenantId"), input);
    return context.json(result, 201);
  });

  router.get("/content/:contentId", async (context) => {
    const content = await getContentById(database, context.get("tenantId"), context.req.param("contentId"));

    if (!content) {
      throw new AppError(404, "not_found", "Content item not found.");
    }

    return context.json({ content });
  });

  router.post("/content/:contentId/versions", async (context) => {
    const input = await parseJson(context, upsertContentVersionSchema);
    const version = await createContentVersion(
      database,
      context.get("tenantId"),
      context.req.param("contentId"),
      input,
    );

    return context.json({ version }, 201);
  });

  return router;
}

