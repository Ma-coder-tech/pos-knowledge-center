export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function isUniqueViolation(error: unknown): error is { code: string; detail?: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isUniqueViolation(error)) {
    return new AppError(409, "conflict", "A record with the same unique value already exists.", {
      detail: error.detail,
    });
  }

  if (error instanceof Error) {
    return new AppError(500, "internal_error", error.message);
  }

  return new AppError(500, "internal_error", "An unexpected error occurred.");
}

