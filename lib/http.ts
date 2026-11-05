import { NextResponse } from "next/server";
import { z } from "zod";
import { BushaApiError, DuroError, mapBushaError } from "@/lib/errors";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(err: unknown) {
  let e: DuroError;
  if (err instanceof DuroError) e = err;
  else if (err instanceof BushaApiError) e = mapBushaError(err);
  else if (err instanceof z.ZodError) {
    e = new DuroError(
      "VALIDATION",
      err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "),
      400,
      err.issues,
    );
  } else {
    console.error("[duro] unhandled error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    e = new DuroError("INTERNAL", message, 500);
  }
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code: e.code, message: e.message, details: e.details } },
    { status: e.status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Wraps a route handler with uniform error -> JSON mapping. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        (err as { digest?: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
      ) {
        throw err;
      }
      return fail(err);
    }
  };
}

/** Parse + validate a JSON body. Empty body is treated as `{}`. */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const text = await req.text();
  let json: unknown = {};
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new DuroError("VALIDATION", "Body must be valid JSON", 400);
    }
  }
  return schema.parse(json);
}
