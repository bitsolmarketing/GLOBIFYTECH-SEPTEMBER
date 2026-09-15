export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UNAVAILABLE"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static notFound(what = "Resource") {
    return new AppError("NOT_FOUND", `${what} was not found.`);
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new AppError("FORBIDDEN", message);
  }
  static unauthenticated(message = "Please sign in to continue.") {
    return new AppError("UNAUTHENTICATED", message);
  }
  static validation(message = "Please check the highlighted fields.", details?: unknown) {
    return new AppError("VALIDATION", message, details);
  }
  static conflict(message: string) {
    return new AppError("CONFLICT", message);
  }
  static rateLimited(message = "Too many requests. Please slow down.") {
    return new AppError("RATE_LIMITED", message);
  }
  static unavailable(message = "This feature is not available yet.") {
    return new AppError("UNAVAILABLE", message);
  }
}

export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  UNAVAILABLE: 501,
  INTERNAL: 500,
};

/** Normalise any thrown value into an AppError without leaking internals. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "FORBIDDEN") return AppError.forbidden((error as Error).message);
    if (code === "UNAUTHENTICATED") return AppError.unauthenticated((error as Error).message);
    // Prisma unique constraint
    if (code === "P2002") return AppError.conflict("A record with those details already exists.");
    if (code === "P2025") return AppError.notFound();
  }
  return new AppError("INTERNAL", "Something went wrong on our side. Please try again.");
}

/** Standard result shape returned by server actions to client components. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fields?: Record<string, string[]> } };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: unknown): ActionResult<never> {
  const appError = toAppError(error);
  const fields =
    appError.code === "VALIDATION" && appError.details && typeof appError.details === "object"
      ? (appError.details as Record<string, string[]>)
      : undefined;
  return { ok: false, error: { code: appError.code, message: appError.message, fields } };
}
