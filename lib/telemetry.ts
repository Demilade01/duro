import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { apiLogs } from "@/lib/db/schema";

export type LogDirection = "OUTGOING" | "INCOMING_WEBHOOK" | "GUARD" | "SIMULATOR";

export interface LogEntry {
  direction: LogDirection;
  mode: string;
  method: string;
  path: string;
  status?: number | null;
  durationMs?: number | null;
  profileId?: string | null;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  note?: string;
}

const MAX_STRING = 512;

/** Strip base64 images & secrets and cap string sizes so logs stay readable. */
export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[depth-limit]";
  if (typeof value === "string") {
    if (value.startsWith("data:image/")) {
      return `[base64 image ${(value.length / 1024).toFixed(1)}KB redacted]`;
    }
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => sanitize(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = /authorization|secret|token|password/i.test(k) ? "[redacted]" : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Fire-and-forget safe: telemetry failures never break a money flow. */
export async function logApi(entry: LogEntry): Promise<void> {
  try {
    await getDb().insert(apiLogs).values({
      direction: entry.direction,
      mode: entry.mode,
      method: entry.method,
      path: entry.path,
      status: entry.status ?? null,
      durationMs: entry.durationMs ?? null,
      profileId: entry.profileId ?? null,
      requestHeaders: entry.requestHeaders,
      requestBody: sanitize(entry.requestBody ?? null),
      responseBody: sanitize(entry.responseBody ?? null),
      note: entry.note,
    });
  } catch (err) {
    console.error("[telemetry] failed to write api log", err);
  }
}

export async function recentLogs(limit = 50) {
  return getDb().select().from(apiLogs).orderBy(desc(apiLogs.createdAt)).limit(limit);
}
