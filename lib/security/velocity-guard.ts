/**
 * Lost-phone / SIM-swap velocity guard.
 *
 * A request from a device that is not the user's `trustedDeviceId` engages a
 * 24-hour cooling-off lock. While locked:
 *   - nothing may leave the USDC "Save" balance (conversions out, pledges)
 *   - remittances may only go to pre-existing, pre-verified recipients
 * The lock is cleared only by NIN + liveness selfie re-verification.
 */
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userProfiles, type UserProfile } from "@/lib/db/schema";
import { DuroError } from "@/lib/errors";
import { logApi } from "@/lib/telemetry";

export const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_TRUSTED_DEVICE = "DEV_TUNDE_IPHONE_01";
export const ATTACKER_DEVICE = "DEV_HACKER_99";

export interface LockState {
  active: boolean;
  until: string | null;
  remainingMs: number;
  deviceTrusted: boolean;
  trustedDeviceId: string;
}

export function isLocked(user: Pick<UserProfile, "simSwapLockedUntil">, now = Date.now()): boolean {
  return !!user.simSwapLockedUntil && user.simSwapLockedUntil.getTime() > now;
}

export function getLockState(user: UserProfile, deviceId: string | null): LockState {
  const active = isLocked(user);
  return {
    active,
    until: active ? user.simSwapLockedUntil!.toISOString() : null,
    remainingMs: active ? user.simSwapLockedUntil!.getTime() - Date.now() : 0,
    deviceTrusted: deviceId === user.trustedDeviceId,
    trustedDeviceId: user.trustedDeviceId,
  };
}

/** Engage (or keep) the 24h lock. Never shortens an existing lock. */
export async function engageLock(
  user: UserProfile,
  opts: { mode: string; deviceId: string | null; reason: string },
): Promise<UserProfile> {
  if (isLocked(user)) return user;
  const until = new Date(Date.now() + LOCK_DURATION_MS);
  const [updated] = await getDb()
    .update(userProfiles)
    .set({ simSwapLockedUntil: until })
    .where(eq(userProfiles.id, user.id))
    .returning();
  await logApi({
    direction: "GUARD",
    mode: opts.mode,
    method: "LOCK",
    path: "velocity-guard/engage",
    status: 423,
    profileId: user.bushaProfileId,
    requestHeaders: { "x-device-id": opts.deviceId ?? "(none)" },
    responseBody: { simSwapLockedUntil: until.toISOString(), trustedDeviceId: user.trustedDeviceId },
    note: opts.reason,
  });
  return updated;
}

/** Runs on every device-bound request: unknown device => engage lock. */
export async function detectDevice(user: UserProfile, deviceId: string, mode: string): Promise<UserProfile> {
  if (deviceId === user.trustedDeviceId) return user;
  return engageLock(user, {
    mode,
    deviceId,
    reason: `Unrecognised device "${deviceId}" (trusted: "${user.trustedDeviceId}") — 24h cooling-off engaged`,
  });
}

export type GuardedAction =
  | { type: "SAVE_WITHDRAW"; description: string }
  | { type: "REMIT"; recipient: { label: string; isPreVerified: boolean } | null };

/** Throws 423 if the action is not permitted under the current lock. */
export async function enforceVelocityGuard(
  user: UserProfile,
  action: GuardedAction,
  ctx: { mode: string; deviceId: string | null },
): Promise<void> {
  if (!isLocked(user)) return;
  const until = user.simSwapLockedUntil!.toISOString();

  let error: DuroError | null = null;
  if (action.type === "SAVE_WITHDRAW") {
    error = new DuroError(
      "VELOCITY_LOCKED",
      "Your Save balance is frozen for 24 hours because we noticed a new device. Verify your identity to unlock.",
      423,
      { lockedUntil: until, action: action.description },
    );
  } else if (!action.recipient || !action.recipient.isPreVerified) {
    error = new DuroError(
      "UNVERIFIED_RECIPIENT_LOCKED",
      "For your safety, you can only send to saved family recipients for the next 24 hours.",
      423,
      { lockedUntil: until, recipient: action.recipient?.label ?? "new recipient" },
    );
  }
  if (!error) return;

  await logApi({
    direction: "GUARD",
    mode: ctx.mode,
    method: "BLOCK",
    path: `velocity-guard/${action.type.toLowerCase()}`,
    status: 423,
    profileId: user.bushaProfileId,
    requestHeaders: { "x-device-id": ctx.deviceId ?? "(none)" },
    responseBody: { code: error.code, ...(error.details as object) },
    note: error.message,
  });
  throw error;
}

export async function clearLockAndTrustDevice(user: UserProfile, deviceId: string): Promise<UserProfile> {
  const [updated] = await getDb()
    .update(userProfiles)
    .set({ simSwapLockedUntil: null, trustedDeviceId: deviceId })
    .where(eq(userProfiles.id, user.id))
    .returning();
  return updated;
}
