import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, STATUS_BY_CODE, toAppError } from "@/server/errors";
import { fieldErrors } from "@/lib/validation/common";

export function jsonOk<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Please check the highlighted fields.", fields: fieldErrors(error) } },
      { status: 422 },
    );
  }
  const appError = toAppError(error);
  if (appError.code === "INTERNAL") console.error(JSON.stringify({ level: "error", msg: "api error", err: (error as Error)?.message }));
  return NextResponse.json(
    { error: { code: appError.code, message: appError.message, ...(appError.details ? { details: appError.details } : {}) } },
    { status: STATUS_BY_CODE[appError.code] },
  );
}

/** Wraps a route handler so thrown AppErrors / ZodErrors become JSON envelopes. */
export function handle<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      return await fn(req, ctx);
    } catch (error) {
      return jsonError(error);
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw AppError.validation("Request body must be valid JSON.");
  }
}
