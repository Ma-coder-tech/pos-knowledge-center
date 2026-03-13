import { pgEnum, timestamp } from "drizzle-orm/pg-core";
import {
  appRoleValues,
  audienceTypeValues,
  conditionTypeValues,
  contentTypeValues,
  deviceCategoryValues,
  flowNodeTypeValues,
  issueStatusValues,
  mediaKindValues,
  messageRoleValues,
  processingStatusValues,
  sourceTypeValues,
  workflowStatusValues,
} from "../../domain/constants";

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const appRoleEnum = pgEnum("app_role", appRoleValues);
export const contentTypeEnum = pgEnum("content_type", contentTypeValues);
export const workflowStatusEnum = pgEnum("workflow_status", workflowStatusValues);
export const audienceTypeEnum = pgEnum("audience_type", audienceTypeValues);
export const sourceTypeEnum = pgEnum("source_type", sourceTypeValues);
export const mediaKindEnum = pgEnum("media_kind", mediaKindValues);
export const processingStatusEnum = pgEnum("processing_status", processingStatusValues);
export const deviceCategoryEnum = pgEnum("device_category", deviceCategoryValues);
export const flowNodeTypeEnum = pgEnum("flow_node_type", flowNodeTypeValues);
export const conditionTypeEnum = pgEnum("condition_type", conditionTypeValues);
export const messageRoleEnum = pgEnum("message_role", messageRoleValues);
export const issueStatusEnum = pgEnum("issue_status", issueStatusValues);

