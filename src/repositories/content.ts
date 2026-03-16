import { and, desc, eq, inArray } from "drizzle-orm";
import type { CreateContentInput, UpsertContentVersionInput } from "../api/contracts";
import type { Database } from "../db/client";
import {
  contentItemDeviceModels,
  contentItemModules,
  contentItemProducts,
  contentItemReleaseVersions,
  contentItems,
  contentItemTags,
  contentItemVerticals,
  contentVersions,
} from "../db/schema/content";
import {
  deviceModels,
  modules,
  products,
  releaseVersions,
} from "../db/schema/catalog";
import { AppError } from "../lib/errors";
import { slugify } from "../lib/slug";
import type { DbExecutor } from "./shared";

type ContentFilters = {
  status?: string;
  type?: string;
  audience?: string;
  productId?: string;
  moduleId?: string;
  deviceModelId?: string;
  releaseVersionId?: string;
  limit?: number;
};

async function assertTenantRecords(executor: DbExecutor, tenantId: string, ids: string[], field: string) {
  if (ids.length === 0) {
    return;
  }

  let rows: Array<{ id: string }> = [];

  switch (field) {
    case "productIds":
      rows = await executor
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)));
      break;
    case "moduleIds":
      rows = await executor
        .select({ id: modules.id })
        .from(modules)
        .where(and(eq(modules.tenantId, tenantId), inArray(modules.id, ids)));
      break;
    case "deviceModelIds":
      rows = await executor
        .select({ id: deviceModels.id })
        .from(deviceModels)
        .where(and(eq(deviceModels.tenantId, tenantId), inArray(deviceModels.id, ids)));
      break;
    case "releaseVersionIds":
      rows = await executor
        .select({ id: releaseVersions.id })
        .from(releaseVersions)
        .where(and(eq(releaseVersions.tenantId, tenantId), inArray(releaseVersions.id, ids)));
      break;
    default:
      throw new AppError(500, "internal_error", `Unknown association field: ${field}`);
  }

  if (rows.length !== new Set(ids).size) {
    throw new AppError(400, "validation_error", "One or more referenced records do not belong to the tenant.", {
      field,
    });
  }
}

async function ensureUniqueContentSlug(executor: DbExecutor, tenantId: string, title: string) {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [existing] = await executor
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(and(eq(contentItems.tenantId, tenantId), eq(contentItems.slug, candidate)))
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function getContentAssociations(executor: DbExecutor, contentId: string) {
  const [productRows, moduleRows, deviceRows, releaseRows, tagRows, verticalRows] = await Promise.all([
    executor.select().from(contentItemProducts).where(eq(contentItemProducts.contentItemId, contentId)),
    executor.select().from(contentItemModules).where(eq(contentItemModules.contentItemId, contentId)),
    executor
      .select()
      .from(contentItemDeviceModels)
      .where(eq(contentItemDeviceModels.contentItemId, contentId)),
    executor
      .select()
      .from(contentItemReleaseVersions)
      .where(eq(contentItemReleaseVersions.contentItemId, contentId)),
    executor.select().from(contentItemTags).where(eq(contentItemTags.contentItemId, contentId)),
    executor.select().from(contentItemVerticals).where(eq(contentItemVerticals.contentItemId, contentId)),
  ]);

  return {
    productIds: productRows.map((row) => row.productId),
    moduleIds: moduleRows.map((row) => row.moduleId),
    deviceModelIds: deviceRows.map((row) => row.deviceModelId),
    releaseVersionIds: releaseRows.map((row) => row.releaseVersionId),
    tags: tagRows.map((row) => row.tag),
    verticals: verticalRows.map((row) => row.vertical),
  };
}

export async function listContent(database: Database, tenantId: string, filters: ContentFilters) {
  const baseConditions = [eq(contentItems.tenantId, tenantId)];

  if (filters.status) {
    baseConditions.push(eq(contentItems.currentStatus, filters.status as typeof contentItems.$inferSelect.currentStatus));
  }

  if (filters.type) {
    baseConditions.push(eq(contentItems.type, filters.type as typeof contentItems.$inferSelect.type));
  }

  if (filters.audience) {
    baseConditions.push(eq(contentItems.audience, filters.audience as typeof contentItems.$inferSelect.audience));
  }

  const items = await database
    .select()
    .from(contentItems)
    .where(and(...baseConditions))
    .orderBy(desc(contentItems.updatedAt))
    .limit(filters.limit ?? 25);

  let filteredItems = items;

  if (filters.productId) {
    const rows = await database
      .select({ contentItemId: contentItemProducts.contentItemId })
      .from(contentItemProducts)
      .where(eq(contentItemProducts.productId, filters.productId));
    const allowedIds = new Set(rows.map((row) => row.contentItemId));
    filteredItems = filteredItems.filter((item) => allowedIds.has(item.id));
  }

  if (filters.moduleId) {
    const rows = await database
      .select({ contentItemId: contentItemModules.contentItemId })
      .from(contentItemModules)
      .where(eq(contentItemModules.moduleId, filters.moduleId));
    const allowedIds = new Set(rows.map((row) => row.contentItemId));
    filteredItems = filteredItems.filter((item) => allowedIds.has(item.id));
  }

  if (filters.deviceModelId) {
    const rows = await database
      .select({ contentItemId: contentItemDeviceModels.contentItemId })
      .from(contentItemDeviceModels)
      .where(eq(contentItemDeviceModels.deviceModelId, filters.deviceModelId));
    const allowedIds = new Set(rows.map((row) => row.contentItemId));
    filteredItems = filteredItems.filter((item) => allowedIds.has(item.id));
  }

  if (filters.releaseVersionId) {
    const rows = await database
      .select({ contentItemId: contentItemReleaseVersions.contentItemId })
      .from(contentItemReleaseVersions)
      .where(eq(contentItemReleaseVersions.releaseVersionId, filters.releaseVersionId));
    const allowedIds = new Set(rows.map((row) => row.contentItemId));
    filteredItems = filteredItems.filter((item) => allowedIds.has(item.id));
  }

  if (filteredItems.length === 0) {
    return [];
  }

  const versionRows = await database
    .select({
      contentItemId: contentVersions.contentItemId,
      title: contentVersions.title,
      versionNumber: contentVersions.versionNumber,
    })
    .from(contentVersions)
    .where(inArray(contentVersions.contentItemId, filteredItems.map((item) => item.id)))
    .orderBy(desc(contentVersions.versionNumber));

  const latestTitleByContentId = new Map<string, string>();
  for (const row of versionRows) {
    if (!latestTitleByContentId.has(row.contentItemId)) {
      latestTitleByContentId.set(row.contentItemId, row.title);
    }
  }

  return filteredItems.map((item) => ({
    id: item.id,
    type: item.type,
    title: latestTitleByContentId.get(item.id) ?? item.slug,
    status: item.currentStatus,
    audience: item.audience,
    updatedAt: item.updatedAt,
  }));
}

export async function getContentById(database: Database, tenantId: string, contentId: string) {
  const [content] = await database
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.id, contentId), eq(contentItems.tenantId, tenantId)))
    .limit(1);

  if (!content) {
    return null;
  }

  const [versions, associations] = await Promise.all([
    database
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentItemId, contentId))
      .orderBy(desc(contentVersions.versionNumber)),
    getContentAssociations(database, contentId),
  ]);

  return {
    ...content,
    ...associations,
    versions,
  };
}

export async function getContentBySlug(database: Database, tenantId: string, slug: string) {
  const [content] = await database
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.tenantId, tenantId), eq(contentItems.slug, slug)))
    .limit(1);

  if (!content) {
    return null;
  }

  return getContentById(database, tenantId, content.id);
}

export async function listKnowledgeBaseArticles(
  database: Database,
  tenantId: string,
  options: { q?: string; limit?: number } = {},
) {
  const items = await database
    .select()
    .from(contentItems)
    .where(eq(contentItems.tenantId, tenantId))
    .orderBy(desc(contentItems.updatedAt))
    .limit(Math.max((options.limit ?? 12) * 4, 24));

  const visibleItems = items.filter(
    (item) => item.audience !== "internal" && item.currentStatus === "published",
  );

  if (visibleItems.length === 0) {
    return [];
  }

  const versions = await database
    .select()
    .from(contentVersions)
    .where(inArray(contentVersions.contentItemId, visibleItems.map((item) => item.id)))
    .orderBy(desc(contentVersions.versionNumber));

  const latestVersionByContentId = new Map<string, typeof contentVersions.$inferSelect>();
  for (const version of versions) {
    if (!latestVersionByContentId.has(version.contentItemId)) {
      latestVersionByContentId.set(version.contentItemId, version);
    }
  }

  const query = options.q?.trim().toLowerCase();

  return visibleItems
    .map((item) => {
      const latestVersion = latestVersionByContentId.get(item.id);
      const preview = latestVersion?.summary ?? latestVersion?.body ?? "";

      return {
        id: item.id,
        slug: item.slug,
        type: item.type,
        title: latestVersion?.title ?? item.slug,
        summary: latestVersion?.summary ?? null,
        preview,
        status: item.currentStatus,
        audience: item.audience,
        updatedAt: item.updatedAt,
      };
    })
    .filter((item) => {
      if (!query) {
        return true;
      }

      const haystack = `${item.title}\n${item.summary ?? ""}\n${item.preview}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, options.limit ?? 12);
}

export async function listAdminArticles(
  database: Database,
  tenantId: string,
  options: { q?: string; limit?: number } = {},
) {
  const items = await database
    .select()
    .from(contentItems)
    .where(eq(contentItems.tenantId, tenantId))
    .orderBy(desc(contentItems.updatedAt))
    .limit(Math.max((options.limit ?? 12) * 4, 24));

  if (items.length === 0) {
    return [];
  }

  const versions = await database
    .select()
    .from(contentVersions)
    .where(inArray(contentVersions.contentItemId, items.map((item) => item.id)))
    .orderBy(desc(contentVersions.versionNumber));

  const latestVersionByContentId = new Map<string, typeof contentVersions.$inferSelect>();
  for (const version of versions) {
    if (!latestVersionByContentId.has(version.contentItemId)) {
      latestVersionByContentId.set(version.contentItemId, version);
    }
  }

  const query = options.q?.trim().toLowerCase();

  return items
    .map((item) => {
      const latestVersion = latestVersionByContentId.get(item.id);
      const preview = latestVersion?.summary ?? latestVersion?.body ?? "";

      return {
        id: item.id,
        slug: item.slug,
        type: item.type,
        title: latestVersion?.title ?? item.slug,
        summary: latestVersion?.summary ?? null,
        preview,
        status: item.currentStatus,
        audience: item.audience,
        updatedAt: item.updatedAt,
        latestVersionId: latestVersion?.id ?? null,
        latestVersionNumber: latestVersion?.versionNumber ?? null,
      };
    })
    .filter((item) => {
      if (!query) {
        return true;
      }

      const haystack = `${item.title}\n${item.summary ?? ""}\n${item.preview}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, options.limit ?? 12);
}

export async function createContent(database: Database, tenantId: string, input: CreateContentInput) {
  return database.transaction(async (tx) => {
    await Promise.all([
      assertTenantRecords(tx, tenantId, input.productIds, "productIds"),
      assertTenantRecords(tx, tenantId, input.moduleIds, "moduleIds"),
      assertTenantRecords(tx, tenantId, input.deviceModelIds, "deviceModelIds"),
      assertTenantRecords(tx, tenantId, input.releaseVersionIds, "releaseVersionIds"),
    ]);

    const slug = await ensureUniqueContentSlug(tx, tenantId, input.title);
    const [content] = await tx
      .insert(contentItems)
      .values({
        tenantId,
        type: input.type,
        currentStatus: "draft",
        audience: input.audience,
        slug,
      })
      .returning();

    const [version] = await tx
      .insert(contentVersions)
      .values({
        contentItemId: content.id,
        versionNumber: 1,
        title: input.title,
        summary: input.summary,
        bodyFormat: input.body?.format ?? "md",
        body: input.body?.value ?? `# ${input.title}\n`,
        status: "draft",
      })
      .returning();

    if (input.productIds.length > 0) {
      await tx.insert(contentItemProducts).values(
        input.productIds.map((productId) => ({
          contentItemId: content.id,
          productId,
        })),
      );
    }

    if (input.moduleIds.length > 0) {
      await tx.insert(contentItemModules).values(
        input.moduleIds.map((moduleId) => ({
          contentItemId: content.id,
          moduleId,
        })),
      );
    }

    if (input.deviceModelIds.length > 0) {
      await tx.insert(contentItemDeviceModels).values(
        input.deviceModelIds.map((deviceModelId) => ({
          contentItemId: content.id,
          deviceModelId,
        })),
      );
    }

    if (input.releaseVersionIds.length > 0) {
      await tx.insert(contentItemReleaseVersions).values(
        input.releaseVersionIds.map((releaseVersionId) => ({
          contentItemId: content.id,
          releaseVersionId,
        })),
      );
    }

    if (input.tags.length > 0) {
      await tx.insert(contentItemTags).values(
        input.tags.map((tag) => ({
          contentItemId: content.id,
          tag,
        })),
      );
    }

    if (input.verticals.length > 0) {
      await tx.insert(contentItemVerticals).values(
        input.verticals.map((vertical) => ({
          contentItemId: content.id,
          vertical,
        })),
      );
    }

    return { content, version };
  });
}

export async function createContentVersion(
  database: Database,
  tenantId: string,
  contentId: string,
  input: UpsertContentVersionInput,
) {
  const [content] = await database
    .select({ id: contentItems.id })
    .from(contentItems)
    .where(and(eq(contentItems.id, contentId), eq(contentItems.tenantId, tenantId)))
    .limit(1);

  if (!content) {
    throw new AppError(404, "not_found", "Content item not found.");
  }

  const [latestVersion] = await database
    .select({ versionNumber: contentVersions.versionNumber })
    .from(contentVersions)
    .where(eq(contentVersions.contentItemId, contentId))
    .orderBy(desc(contentVersions.versionNumber))
    .limit(1);

  const [version] = await database
    .insert(contentVersions)
    .values({
      contentItemId: contentId,
      versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      title: input.title,
      summary: input.summary,
      bodyFormat: input.body.format,
      body: input.body.value,
      status: "draft",
      changeSummary: input.changeSummary,
    })
    .returning();

  return version;
}

export async function publishLatestContent(
  database: Database,
  tenantId: string,
  contentId: string,
) {
  return database.transaction(async (tx) => {
    const [content] = await tx
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.id, contentId), eq(contentItems.tenantId, tenantId)))
      .limit(1);

    if (!content) {
      throw new AppError(404, "not_found", "Content item not found.");
    }

    const [latestVersion] = await tx
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentItemId, contentId))
      .orderBy(desc(contentVersions.versionNumber))
      .limit(1);

    if (!latestVersion) {
      throw new AppError(400, "validation_error", "Content must have at least one version before publishing.");
    }

    await tx
      .update(contentVersions)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentVersions.id, latestVersion.id));

    const [publishedContent] = await tx
      .update(contentItems)
      .set({
        currentStatus: "published",
        currentPublishedVersionId: latestVersion.id,
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, contentId))
      .returning();

    return {
      content: publishedContent,
      versionId: latestVersion.id,
    };
  });
}
