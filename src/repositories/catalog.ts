import { and, asc, eq, inArray } from "drizzle-orm";
import type {
  CreateDeviceModelInput,
  CreateGlossaryTermInput,
  CreateModuleInput,
  CreateProductInput,
  CreateReleaseVersionInput,
} from "../api/contracts";
import type { Database } from "../db/client";
import {
  deviceModelAliases,
  deviceModels,
  glossaryAliases,
  glossaryTerms,
  modules,
  products,
  releaseVersions,
} from "../db/schema/catalog";
import { AppError } from "../lib/errors";
import type { DbExecutor } from "./shared";

async function assertProductBelongsToTenant(executor: DbExecutor, tenantId: string, productId: string) {
  const [product] = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);

  if (!product) {
    throw new AppError(400, "validation_error", "Referenced product does not belong to the tenant.", {
      field: "productId",
    });
  }
}

export async function getCatalog(database: Database, tenantId: string) {
  const [productRows, moduleRows, deviceRows, releaseRows, glossaryRows] = await Promise.all([
    database.select().from(products).where(eq(products.tenantId, tenantId)).orderBy(asc(products.name)),
    database.select().from(modules).where(eq(modules.tenantId, tenantId)).orderBy(asc(modules.name)),
    database
      .select()
      .from(deviceModels)
      .where(eq(deviceModels.tenantId, tenantId))
      .orderBy(asc(deviceModels.vendor), asc(deviceModels.model)),
    database
      .select()
      .from(releaseVersions)
      .where(eq(releaseVersions.tenantId, tenantId))
      .orderBy(asc(releaseVersions.version)),
    database
      .select()
      .from(glossaryTerms)
      .where(eq(glossaryTerms.tenantId, tenantId))
      .orderBy(asc(glossaryTerms.canonicalTerm)),
  ]);

  const [deviceAliasRows, glossaryAliasRows] = await Promise.all([
    deviceRows.length === 0
      ? Promise.resolve([])
      : database
          .select()
          .from(deviceModelAliases)
          .where(inArray(deviceModelAliases.deviceModelId, deviceRows.map((row) => row.id))),
    glossaryRows.length === 0
      ? Promise.resolve([])
      : database
          .select()
          .from(glossaryAliases)
          .where(inArray(glossaryAliases.glossaryTermId, glossaryRows.map((row) => row.id))),
  ]);

  const aliasesByDeviceId = new Map<string, string[]>();
  for (const row of deviceAliasRows) {
    const aliases = aliasesByDeviceId.get(row.deviceModelId) ?? [];
    aliases.push(row.alias);
    aliasesByDeviceId.set(row.deviceModelId, aliases);
  }

  const aliasesByTermId = new Map<string, string[]>();
  for (const row of glossaryAliasRows) {
    const aliases = aliasesByTermId.get(row.glossaryTermId) ?? [];
    aliases.push(row.alias);
    aliasesByTermId.set(row.glossaryTermId, aliases);
  }

  return {
    products: productRows,
    modules: moduleRows,
    deviceModels: deviceRows.map((row) => ({
      ...row,
      aliases: aliasesByDeviceId.get(row.id) ?? [],
    })),
    releaseVersions: releaseRows,
    glossaryTerms: glossaryRows.map((row) => ({
      ...row,
      aliases: aliasesByTermId.get(row.id) ?? [],
    })),
  };
}

export async function createProduct(database: Database, tenantId: string, input: CreateProductInput) {
  const [product] = await database
    .insert(products)
    .values({
      tenantId,
      name: input.name,
      slug: input.slug,
      description: input.description,
    })
    .returning();

  return product;
}

export async function createModule(database: Database, tenantId: string, input: CreateModuleInput) {
  if (input.productId) {
    await assertProductBelongsToTenant(database, tenantId, input.productId);
  }

  const [module] = await database
    .insert(modules)
    .values({
      tenantId,
      productId: input.productId,
      name: input.name,
      slug: input.slug,
      description: input.description,
    })
    .returning();

  return module;
}

export async function createDeviceModel(database: Database, tenantId: string, input: CreateDeviceModelInput) {
  return database.transaction(async (tx) => {
    if (input.productId) {
      await assertProductBelongsToTenant(tx, tenantId, input.productId);
    }

    const [deviceModel] = await tx
      .insert(deviceModels)
      .values({
        tenantId,
        productId: input.productId,
        vendor: input.vendor,
        model: input.model,
        category: input.category,
      })
      .returning();

    if (input.aliases.length > 0) {
      await tx.insert(deviceModelAliases).values(
        input.aliases.map((alias) => ({
          deviceModelId: deviceModel.id,
          alias,
        })),
      );
    }

    return {
      ...deviceModel,
      aliases: input.aliases,
    };
  });
}

export async function createReleaseVersion(
  database: Database,
  tenantId: string,
  input: CreateReleaseVersionInput,
) {
  await assertProductBelongsToTenant(database, tenantId, input.productId);

  const [releaseVersion] = await database
    .insert(releaseVersions)
    .values({
      tenantId,
      productId: input.productId,
      version: input.version,
      channel: input.channel,
      releasedAt: input.releasedAt ? new Date(input.releasedAt) : null,
    })
    .returning();

  return releaseVersion;
}

export async function createGlossaryTerm(database: Database, tenantId: string, input: CreateGlossaryTermInput) {
  return database.transaction(async (tx) => {
    const [glossaryTerm] = await tx
      .insert(glossaryTerms)
      .values({
        tenantId,
        canonicalTerm: input.canonicalTerm,
        description: input.description,
      })
      .returning();

    if (input.aliases.length > 0) {
      await tx.insert(glossaryAliases).values(
        input.aliases.map((alias) => ({
          glossaryTermId: glossaryTerm.id,
          alias,
        })),
      );
    }

    return {
      ...glossaryTerm,
      aliases: input.aliases,
    };
  });
}
