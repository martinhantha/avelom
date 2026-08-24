import { createError } from "h3";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "OUTDATED_VERSION"
  | "NOT_FOUND";

export function throwApiError(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): never {
  throw createError({
    statusCode,
    statusMessage: message,
    data: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

export function throwValidation(message: string, details?: Record<string, unknown>): never {
  throwApiError(400, "VALIDATION_ERROR", message, details);
}

export function throwNotFound(message = "Nicht gefunden", details?: Record<string, unknown>): never {
  throwApiError(404, "NOT_FOUND", message, details);
}

export function throwConflict(message: string, details?: Record<string, unknown>): never {
  throwApiError(409, "CONFLICT", message, details);
}

export function throwVersionConflict(message: string, details?: Record<string, unknown>): never {
  throwApiError(409, "OUTDATED_VERSION", message, details);
}
