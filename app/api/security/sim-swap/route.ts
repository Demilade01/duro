import { z } from "zod";
import { getContext } from "@/lib/context";
import { DuroError } from "@/lib/errors";
import { handler, ok, parseBody } from "@/lib/http";
import { logApi } from "@/lib/telemetry";
import {
  ATTACKER_DEVICE,
  clearLockAndTrustDevice,
  engageLock,
  getLockState,
} from "@/lib/security/velocity-guard";
import { publicProfile } from "@/lib/services/wallet";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SIMULATE_ATTACK"),
    attackerDeviceId: z.string().min(3).default(ATTACKER_DEVICE),
  }),
  z.object({
    action: z.literal("RECOVER_IDENTITY"),
    nin: z.string().regex(/^\d{11}$/, "NIN must be 11 digits"),
    /** Webcam capture or sample, as a data URL. */
    selfieImage: z.string().startsWith("data:image/"),
    documentImage: z.string().startsWith("data:image/").optional(),
  }),
]);

export const POST = handler(async (req) => {
  const body = await parseBody(req, Body);

  if (body.action === "SIMULATE_ATTACK") {
    const ctx = await getContext(req, { requireDevice: false });
    const user = await engageLock(ctx.user, {
      mode: ctx.mode,
      deviceId: body.attackerDeviceId,
      reason: `Simulated SIM-swap: login from unrecognised device "${body.attackerDeviceId}" — 24h cooling-off engaged`,
    });
    await logApi({
      direction: "SIMULATOR", mode: ctx.mode, method: "ATTACK", path: "sim-swap/simulate",
      status: 200, profileId: user.bushaProfileId,
      requestHeaders: { "x-device-id": body.attackerDeviceId },
      responseBody: { simSwapLockedUntil: user.simSwapLockedUntil?.toISOString() },
      note: "Client should now send x-device-id: " + body.attackerDeviceId,
    });
    return ok({ deviceId: body.attackerDeviceId, lock: getLockState(user, body.attackerDeviceId) });
  }

  // RECOVER_IDENTITY — trust the device the request is coming from.
  const ctx = await getContext(req);
  const deviceId = ctx.deviceId!;
  if (body.nin !== ctx.user.nin) {
    await logApi({
      direction: "GUARD", mode: ctx.mode, method: "BLOCK", path: "velocity-guard/recovery",
      status: 403, profileId: ctx.user.bushaProfileId, requestHeaders: { "x-device-id": deviceId },
      responseBody: { code: "KYC_FAILED" }, note: "Recovery failed: NIN does not match profile",
    });
    throw new DuroError("KYC_FAILED", "NIN does not match our records", 403);
  }

  const verification = await ctx.busha.verifyCustomerIdentity(ctx.user.bushaProfileId, {
    document_number: body.nin,
    document_image: body.documentImage ?? body.selfieImage,
    selfie_image: body.selfieImage,
  });
  if (verification.status !== "verified" || !verification.liveness?.passed) {
    throw new DuroError("KYC_FAILED", "Liveness check failed. Please retake your selfie.", 403, verification);
  }

  const user = await clearLockAndTrustDevice(ctx.user, deviceId);
  await logApi({
    direction: "GUARD", mode: ctx.mode, method: "UNLOCK", path: "velocity-guard/recovery",
    status: 200, profileId: user.bushaProfileId, requestHeaders: { "x-device-id": deviceId },
    responseBody: { trustedDeviceId: deviceId, simSwapLockedUntil: null },
    note: `Identity re-verified (NIN + liveness ${verification.liveness.score}); device "${deviceId}" trusted`,
  });
  return ok({ deviceId, lock: getLockState(user, deviceId), verification, profile: publicProfile(user) });
});
