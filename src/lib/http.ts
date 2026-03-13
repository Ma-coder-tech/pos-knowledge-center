import type { Context } from "hono";
import type { z } from "zod";
import { AppError } from "./errors";

export async function parseJson<TSchema extends z.ZodTypeAny>(
  context: Context,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const raw = await context.req.json().catch(() => {
    throw new AppError(400, "invalid_json", "Request body must be valid JSON.");
  });

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw new AppError(400, "validation_error", "Request body validation failed.", parsed.error.flatten());
  }

  return parsed.data;
}

export function parseQuery<TSchema extends z.ZodTypeAny>(
  context: Context,
  schema: TSchema,
): z.infer<TSchema> {
  const parsed = schema.safeParse(context.req.query());

  if (!parsed.success) {
    throw new AppError(400, "validation_error", "Query parameter validation failed.", parsed.error.flatten());
  }

  return parsed.data;
}

