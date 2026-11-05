import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userProfiles, type UserProfile } from "@/lib/db/schema";
import { BushaClient, resolveMode } from "@/lib/busha/client";
import type { BushaMode } from "@/lib/busha/types";
import { DuroError } from "@/lib/errors";
import { detectDevice, getLockState, type LockState } from "@/lib/security/velocity-guard";

export interface RequestContext {
  mode: BushaMode;
  deviceId: string | null;
  user: UserProfile;
  lock: LockState;
  busha: BushaClient;
}

/**
 * Resolves the demo user. Duro is single-tenant for the hackathon: an explicit
 * `x-duro-user-id` header wins, otherwise the most recently onboarded profile.
 */
export async function resolveUser(req: Request): Promise<UserProfile> {
  const db = getDb();
  const explicit = req.headers.get("x-duro-user-id");
  const [user] = explicit
    ? await db.select().from(userProfiles).where(eq(userProfiles.id, explicit))
    : await db.select().from(userProfiles).orderBy(desc(userProfiles.createdAt)).limit(1);
  if (!user) {
    throw new DuroError("NOT_ONBOARDED", "No Duro profile yet. Call POST /api/onboarding first.", 404);
  }
  return user;
}

/**
 * Builds the per-request context and runs SIM-swap device detection.
 * `requireDevice: false` is used by judge-console routes (simulators).
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
