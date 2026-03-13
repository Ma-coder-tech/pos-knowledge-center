import { index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { audienceTypeEnum, contentTypeEnum, createdAt, updatedAt, workflowStatusEnum } from "./base";
import { deviceModels, modules, products, releaseVersions } from "./catalog";
import { tenants, users } from "./core";

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: contentTypeEnum("type").notNull(),
    currentStatus: workflowStatusEnum("current_status").notNull().default("draft"),
    audience: audienceTypeEnum("audience").notNull(),
    slug: text("slug").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    // Drizzle generation becomes unstable with this circular foreign key.
    // Keep the column typed here and enforce the FK in manual SQL if needed.
    currentPublishedVersionId: uuid("current_published_version_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    slugUnique: uniqueIndex("content_items_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantStatusIdx: index("idx_content_items_tenant_status").on(table.tenantId, table.currentStatus),
  }),
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    bodyFormat: text("body_format").notNull().default("md"),
    body: text("body").notNull(),
    status: workflowStatusEnum("status").notNull().default("draft"),
    changeSummary: text("change_summary"),
    createdBy: uuid("created_by").references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    itemVersionUnique: uniqueIndex("content_versions_item_version_unique").on(
      table.contentItemId,
      table.versionNumber,
    ),
    itemStatusIdx: index("idx_content_versions_item_status").on(table.contentItemId, table.status),
  }),
);

export const contentItemProducts = pgTable(
  "content_item_products",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.productId] }),
  }),
);

export const contentItemModules = pgTable(
  "content_item_modules",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.moduleId] }),
  }),
);

export const contentItemDeviceModels = pgTable(
  "content_item_device_models",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    deviceModelId: uuid("device_model_id")
      .notNull()
      .references(() => deviceModels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.deviceModelId] }),
  }),
);

export const contentItemReleaseVersions = pgTable(
  "content_item_release_versions",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    releaseVersionId: uuid("release_version_id")
      .notNull()
      .references(() => releaseVersions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.releaseVersionId] }),
  }),
);

export const contentItemVerticals = pgTable(
  "content_item_verticals",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    vertical: text("vertical").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.vertical] }),
  }),
);

export const contentItemTags = pgTable(
  "content_item_tags",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.tag] }),
  }),
);
