import { asc, eq } from "drizzle-orm";
import type { CreateTenantInput } from "../api/contracts";
import type { Database } from "../db/client";
import { tenants } from "../db/schema/core";

export async function createTenant(database: Database, input: CreateTenantInput) {
  const [tenant] = await database
    .insert(tenants)
    .values({
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
    })
    .returning();

  return tenant;
}

export async function listTenants(database: Database) {
  return database.select().from(tenants).orderBy(asc(tenants.name));
}

export async function getTenantById(database: Database, tenantId: string) {
  const [tenant] = await database.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return tenant ?? null;
}

export async function getTenantBySlug(database: Database, tenantSlug: string) {
  const [tenant] = await database.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  return tenant ?? null;
}
