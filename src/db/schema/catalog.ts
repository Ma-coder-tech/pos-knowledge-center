import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, deviceCategoryEnum, updatedAt } from "./base";
import { tenants } from "./core";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex("products_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantIdx: index("idx_products_tenant_id").on(table.tenantId),
  }),
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex("modules_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantProductIdx: index("idx_modules_tenant_product").on(table.tenantId, table.productId),
  }),
);

export const deviceModels = pgTable(
  "device_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    vendor: text("vendor").notNull(),
    model: text("model").notNull(),
    category: deviceCategoryEnum("category").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    vendorModelUnique: uniqueIndex("device_models_tenant_vendor_model_unique").on(
      table.tenantId,
      table.vendor,
      table.model,
    ),
    tenantProductIdx: index("idx_device_models_tenant_product").on(table.tenantId, table.productId),
  }),
);

export const deviceModelAliases = pgTable(
  "device_model_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceModelId: uuid("device_model_id")
      .notNull()
      .references(() => deviceModels.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (table) => ({
    aliasUnique: uniqueIndex("device_model_aliases_device_alias_unique").on(
      table.deviceModelId,
      table.alias,
    ),
    deviceModelIdx: index("idx_device_model_aliases_device_model").on(table.deviceModelId),
  }),
);

export const releaseVersions = pgTable(
  "release_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    channel: text("channel").notNull().default("stable"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    productVersionUnique: uniqueIndex("release_versions_tenant_product_version_channel_unique").on(
      table.tenantId,
      table.productId,
      table.version,
      table.channel,
    ),
    tenantProductIdx: index("idx_release_versions_tenant_product").on(table.tenantId, table.productId),
  }),
);

export const glossaryTerms = pgTable(
  "glossary_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    canonicalTerm: text("canonical_term").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    termUnique: uniqueIndex("glossary_terms_tenant_term_unique").on(
      table.tenantId,
      table.canonicalTerm,
    ),
  }),
);

export const glossaryAliases = pgTable(
  "glossary_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    glossaryTermId: uuid("glossary_term_id")
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (table) => ({
    aliasUnique: uniqueIndex("glossary_aliases_term_alias_unique").on(
      table.glossaryTermId,
      table.alias,
    ),
  }),
);
