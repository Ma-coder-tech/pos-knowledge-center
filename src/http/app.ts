import { Hono } from "hono";
import { db, type Database } from "../db/client";
import { toAppError } from "../lib/errors";
import { createCatalogRouter } from "./routes/catalog";
import { createContentRouter } from "./routes/content";
import { createFlowsRouter } from "./routes/flows";
import { createAdminRouter } from "./routes/admin";
import { createKnowledgeBaseRouter } from "./routes/kb";
import { createSolvedIssuesRouter } from "./routes/solved-issues";
import { createTenantsRouter } from "./routes/tenants";
import type { AppBindings } from "./middleware";
import { createTenantMiddleware, requestIdMiddleware } from "./middleware";

export function createApp(database: Database = db) {
  const app = new Hono<AppBindings>();
  const tenantScoped = new Hono<AppBindings>();

  app.use("*", requestIdMiddleware);

  app.onError((error, context) => {
    const appError = toAppError(error);

    return context.json(
      {
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
          requestId: context.get("requestId"),
        },
      },
      appError.statusCode,
    );
  });

  app.get("/api/v1/health", (context) =>
    context.json({
      ok: true,
      requestId: context.get("requestId"),
    }),
  );

  app.get("/", (context) => context.redirect("/kb"));
  app.route("/admin", createAdminRouter(database));
  app.route("/kb", createKnowledgeBaseRouter(database));

  app.route("/api/v1/tenants", createTenantsRouter(database));

  tenantScoped.use("*", createTenantMiddleware(database));
  tenantScoped.route("/", createCatalogRouter(database));
  tenantScoped.route("/", createContentRouter(database));
  tenantScoped.route("/", createFlowsRouter(database));
  tenantScoped.route("/", createSolvedIssuesRouter(database));

  app.route("/api/v1", tenantScoped);

  return app;
}
