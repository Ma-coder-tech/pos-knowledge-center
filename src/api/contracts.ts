import { z } from "zod";
import {
  audienceTypeValues,
  conditionTypeValues,
  contentTypeValues,
  deviceCategoryValues,
  flowNodeTypeValues,
  mediaKindValues,
  recordingModeValues,
  sourceTypeValues,
  workflowStatusValues,
} from "../domain/constants";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().datetime({ offset: true });

export const createTenantSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  timezone: z.string().min(1).max(120).default("UTC"),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});

export const createModuleSchema = z.object({
  productId: uuidSchema.optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
});

export const createDeviceModelSchema = z.object({
  productId: uuidSchema.optional(),
  vendor: z.string().min(1).max(120),
  model: z.string().min(1).max(120),
  category: z.enum(deviceCategoryValues),
  aliases: z.array(z.string().min(1).max(120)).default([]),
});

export const createReleaseVersionSchema = z.object({
  productId: uuidSchema,
  version: z.string().min(1).max(120),
  channel: z.string().min(1).max(60).default("stable"),
  releasedAt: isoDateSchema.optional(),
});

export const createGlossaryTermSchema = z.object({
  canonicalTerm: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  aliases: z.array(z.string().min(1).max(120)).default([]),
});

export const createContentSchema = z.object({
  type: z.enum(contentTypeValues),
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  audience: z.enum(audienceTypeValues),
  productIds: z.array(uuidSchema).default([]),
  moduleIds: z.array(uuidSchema).default([]),
  deviceModelIds: z.array(uuidSchema).default([]),
  releaseVersionIds: z.array(uuidSchema).default([]),
  verticals: z.array(z.string().min(1).max(60)).default([]),
  tags: z.array(z.string().min(1).max(60)).default([]),
  body: z
    .object({
      format: z.literal("md"),
      value: z.string().min(1),
    })
    .optional(),
});

export const upsertContentVersionSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(2000).optional(),
  body: z.object({
    format: z.literal("md"),
    value: z.string().min(1),
  }),
  changeSummary: z.string().max(1000).optional(),
});

export const contentFilterSchema = paginationSchema.extend({
  status: z.enum(workflowStatusValues).optional(),
  type: z.enum(contentTypeValues).optional(),
  audience: z.enum(audienceTypeValues).optional(),
  productId: uuidSchema.optional(),
  moduleId: uuidSchema.optional(),
  deviceModelId: uuidSchema.optional(),
  releaseVersionId: uuidSchema.optional(),
});

export const publishContentSchema = z.object({
  versionId: uuidSchema,
  publishTarget: z.enum(["internal", "merchant"]),
});

export const retireContentSchema = z.object({
  reason: z.string().min(1).max(1000),
});

export const requestUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive(),
});

export const registerMediaSchema = z.object({
  assetId: uuidSchema,
  sourceType: z.enum(sourceTypeValues),
  mediaKind: z.enum(mediaKindValues).default("video"),
  title: z.string().min(1).max(200),
  linkedContentId: uuidSchema.optional(),
});

export const importYouTubeSchema = z.object({
  url: z.url(),
  title: z.string().min(1).max(200).optional(),
  linkedContentId: uuidSchema.optional(),
});

export const createRecordingSessionSchema = z.object({
  mode: z.enum(recordingModeValues),
  title: z.string().min(1).max(200),
});

export const createFlowSchema = z.object({
  title: z.string().min(1).max(200),
  symptom: z.string().min(1).max(1000),
  audience: z.enum(audienceTypeValues),
  productIds: z.array(uuidSchema).default([]),
  deviceModelIds: z.array(uuidSchema).default([]),
});

export const updateFlowSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    symptom: z.string().min(1).max(1000).optional(),
    audience: z.enum(audienceTypeValues).optional(),
    productIds: z.array(uuidSchema).optional(),
    deviceModelIds: z.array(uuidSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const createFlowNodeSchema = z.object({
  nodeType: z.enum(flowNodeTypeValues),
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
  voiceText: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateFlowNodeSchema = z
  .object({
    nodeType: z.enum(flowNodeTypeValues).optional(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().max(5000).nullable().optional(),
    voiceText: z.string().max(2000).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const createFlowEdgeSchema = z
  .object({
    fromNodeId: uuidSchema,
    toNodeId: uuidSchema,
    conditionType: z.enum(conditionTypeValues),
    conditionValue: z.string().max(255).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.conditionType === "answer_equals" || value.conditionType === "answer_not_equals") &&
      !value.conditionValue
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "conditionValue is required for answer-based edges.",
        path: ["conditionValue"],
      });
    }
  });

export const updateFlowEdgeSchema = z
  .object({
    fromNodeId: uuidSchema.optional(),
    toNodeId: uuidSchema.optional(),
    conditionType: z.enum(conditionTypeValues).optional(),
    conditionValue: z.string().max(255).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const runFlowSchema = z.object({
  deviceModelId: uuidSchema.optional(),
  mode: z.enum(["text", "voice"]).default("text"),
});

export const advanceFlowSessionSchema = z.object({
  answer: z.string().min(1).max(255),
});

export const createSolvedIssueSchema = z.object({
  sourceType: z.enum(["ticket", "call"]),
  sourceReference: z.string().max(120).optional(),
  title: z.string().min(1).max(200),
  symptom: z.string().min(1).max(1000),
  rootCause: z.string().max(4000).optional(),
  resolutionSteps: z.array(z.string().min(1).max(2000)).min(1),
  deviceModelIds: z.array(uuidSchema).default([]),
  productIds: z.array(uuidSchema).default([]),
  audienceRecommendation: z.enum(audienceTypeValues).default("internal"),
});

export const generateSolvedIssueDraftSchema = z.object({
  targetType: z.enum(["article", "troubleshooting_flow"]),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  productId: uuidSchema.optional(),
  moduleId: uuidSchema.optional(),
  deviceModelId: uuidSchema.optional(),
  releaseVersionId: uuidSchema.optional(),
  audience: z.enum(audienceTypeValues).optional(),
});

export const createChatSessionSchema = z.object({
  context: z.object({
    productId: uuidSchema.optional(),
    moduleId: uuidSchema.optional(),
    deviceModelId: uuidSchema.optional(),
    releaseVersionId: uuidSchema.optional(),
    audience: z.enum(audienceTypeValues),
  }),
});

export const sendChatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const groundedCitationSchema = z.object({
  contentId: uuidSchema,
  contentVersionId: uuidSchema.optional(),
  title: z.string().min(1),
  snippet: z.string().min(1),
});

export const chatAnswerSchema = z.object({
  messageId: uuidSchema,
  text: z.string().min(1),
  citations: z.array(groundedCitationSchema),
  confidence: z.number().min(0).max(1).optional(),
  escalationSuggested: z.boolean().default(false),
});

export const usageEventSchema = z.object({
  eventType: z.string().min(1).max(120),
  subjectId: uuidSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const flowFilterSchema = paginationSchema.extend({
  status: z.enum(workflowStatusValues).optional(),
  audience: z.enum(audienceTypeValues).optional(),
  productId: uuidSchema.optional(),
  deviceModelId: uuidSchema.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type CreateDeviceModelInput = z.infer<typeof createDeviceModelSchema>;
export type CreateReleaseVersionInput = z.infer<typeof createReleaseVersionSchema>;
export type CreateGlossaryTermInput = z.infer<typeof createGlossaryTermSchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpsertContentVersionInput = z.infer<typeof upsertContentVersionSchema>;
export type CreateFlowInput = z.infer<typeof createFlowSchema>;
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;
export type CreateFlowNodeInput = z.infer<typeof createFlowNodeSchema>;
export type UpdateFlowNodeInput = z.infer<typeof updateFlowNodeSchema>;
export type CreateFlowEdgeInput = z.infer<typeof createFlowEdgeSchema>;
export type UpdateFlowEdgeInput = z.infer<typeof updateFlowEdgeSchema>;
export type RunFlowInput = z.infer<typeof runFlowSchema>;
export type AdvanceFlowSessionInput = z.infer<typeof advanceFlowSessionSchema>;
export type FlowFilterInput = z.infer<typeof flowFilterSchema>;
export type CreateSolvedIssueInput = z.infer<typeof createSolvedIssueSchema>;
export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
