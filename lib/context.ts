import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userProfiles, type UserProfile } from "@/lib/db/schema";
import { BushaClient, resolveMode } from "@/lib/busha/client";
import type { BushaMode } from "@/lib/busha/types";
import { DuroError } from "@/lib/errors";
import { detectDevice, getLockState, type LockState } from "@/lib/security/velocity-guard";

export const SESSION_COOKIE = "duro_session";

export interface RequestContext {
  mode: BushaMode;
  deviceId: string | null;
  user: UserProfile;
  lock: LockState;
  busha: BushaClient;
}

/** Parse a specific cookie value from a raw Cookie header string. */
export function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      const val = rest.join("=").trim();
      return val ? decodeURIComponent(val) : null;
    }
  }
  return null;
}

/**
 * Resolves the authenticated user strictly from the request's session:
 *  1. `x-duro-user-id` header (injected by middleware or sent by the client SDK)
 *  2. `duro_session` HTTP cookie
 *
 * Never falls back to an arbitrary row in `user_profiles`, ensuring strict
 * per-user session isolation across browsers and devices.
 */
export async function resolveUser(req: Request): Promise<UserProfile> {
  const db = getDb();
  const headerUserId = req.headers.get("x-duro-user-id")?.trim() || null;
  const cookieUserId = getCookieValue(req.headers.get("cookie"), SESSION_COOKIE);
  const userId = headerUserId || cookieUserId;

  if (!userId) {
    throw new DuroError(
      "NOT_ONBOARDED",
      "No active Duro session. Please sign in or complete onboarding.",
      404,
    );
  }

  const [user] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
  if (!user) {
    throw new DuroError(
      "NOT_ONBOARDED",
      "Session expired or profile not found. Please sign in or onboard.",
      404,
    );
  }
  return user;
}

/**
 * Builds the per-request context and runs SIM-swap device detection.
 */
export async function getContext(req: Request, opts: { requireDevice?: boolean } = {}): Promise<RequestContext> {
  const requireDevice = opts.requireDevice ?? true;
  const mode = resolveMode(req.headers.get("x-busha-mode"));
  const deviceId = req.headers.get("x-device-id")?.trim() || null;
  if (requireDevice && !deviceId) {
    throw new DuroError("DEVICE_ID_REQUIRED", "x-device-id header is required", 400);
  }
  let user = await resolveUser(req);
  if (deviceId) user = await detectDevice(user, deviceId, mode);
  return {
    mode,
    deviceId,
    user,
    lock: getLockState(user, deviceId),
    busha: new BushaClient({ mode, profileId: user.bushaProfileId }),
  };
}
