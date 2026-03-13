import type { MiddlewareHandler } from "hono";
import { z } from "zod";
import type { Database } from "../db/client";
import { AppError } from "../lib/errors";
import { getTenantById } from "../repositories/tenants";

export type AppBindings = {
  Variables: {
    requestId: string;
    tenantId: string;
  };
};

const tenantIdHeaderSchema = z.string().uuid();

export const requestIdMiddleware: MiddlewareHandler<AppBindings> = async (context, next) => {
  const requestId = context.req.header("x-request-id") ?? crypto.randomUUID();
  context.set("requestId", requestId);
  context.header("x-request-id", requestId);
  await next();
};

export function createTenantMiddleware(database: Database): MiddlewareHandler<AppBindings> {
  return async (context, next) => {
    const parsed = tenantIdHeaderSchema.safeParse(context.req.header("x-tenant-id"));

    if (!parsed.success) {
      throw new AppError(400, "validation_error", "x-tenant-id header must be a valid UUID.", {
        field: "x-tenant-id",
      });
    }

    const tenant = await getTenantById(database, parsed.data);

    if (!tenant) {
      throw new AppError(404, "tenant_not_found", "Tenant not found.");
    }

    context.set("tenantId", tenant.id);
    await next();
  };
}

