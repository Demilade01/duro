import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { BushaClient, resolveMode } from "@/lib/busha/client";
import { deleteMockProfile, seedMockInsightsHistory } from "@/lib/busha/mock-store";
import { getDb } from "@/lib/db";
import { apiLogs, trustedRecipients, userProfiles } from "@/lib/db/schema";
import { MAMA, SAMPLE_SELFIE_BASE64, TUNDE } from "@/lib/demo";
import { DuroError } from "@/lib/errors";
import { handler, ok, parseBody } from "@/lib/http";
import { DEFAULT_TRUSTED_DEVICE } from "@/lib/security/velocity-guard";
import { publicProfile, publicRecipient } from "@/lib/services/wallet";

const Body = z.object({
  phone: z.string().regex(/^\+?\d{10,15}$/, "Invalid phone number").default(TUNDE.phone),
  email: z.email().default(TUNDE.email),
  fullName: z.string().trim().min(3).refine((v) => v.includes(" "), "Enter first and last name").default(TUNDE.fullName),
  nin: z.string().regex(/^\d{11}$/, "NIN must be 11 digits").default(TUNDE.nin),
  selfieImage: z.string().startsWith("data:image/").default(SAMPLE_SELFIE_BASE64),
  documentImage: z.string().startsWith("data:image/").optional(),
  /** Wipe the existing profile (and MOCK sandbox state + telemetry) first. */
  reset: z.boolean().default(false),
  /** MOCK only: seed 3 months of insights history for the Financial Passport. */
  seedHistory: z.boolean().default(true),
});

export const POST = handler(async (req) => {
  const body = await parseBody(req, Body);
  const mode = resolveMode(req.headers.get("x-busha-mode"));
  const deviceId = req.headers.get("x-device-id")?.trim() || DEFAULT_TRUSTED_DEVICE;
  const db = getDb();

  const findExisting = () =>
    db.select().from(userProfiles).where(or(eq(userProfiles.phone, body.phone), eq(userProfiles.email, body.email)));

  if (body.reset) {
    for (const u of await findExisting()) {
      await db.delete(userProfiles).where(eq(userProfiles.id, u.id)); // cascades recipients + transactions
      if (mode === "MOCK") await deleteMockProfile(u.bushaProfileId);
    }
    await db.delete(apiLogs);
  }

  const [existing] = await findExisting();
  if (existing) {
    if (existing.phone !== body.phone) {
      throw new DuroError("VALIDATION", "Email is already registered to another phone number", 409);
    }
    const recipients = await db.select().from(trustedRecipients).where(eq(trustedRecipients.userId, existing.id));
    return ok({ created: false, profile: publicProfile(existing), recipients: recipients.map(publicRecipient) });
  }

  // 1) Busha individual customer + NIN/selfie KYC
  const [firstName, ...rest] = body.fullName.split(/\s+/);
  const busha = new BushaClient({ mode });
  const customer = await busha.createIndividualCustomer({
    email: body.email,
    first_name: firstName,
    last_name: rest.join(" "),
    phone_number: body.phone,
  });
  const verification = await busha.verifyCustomerIdentity(customer.id, {
    document_number: body.nin,
    document_image: body.documentImage ?? body.selfieImage,
    selfie_image: body.selfieImage,
  });
  if (verification.status !== "verified") {
    throw new DuroError("KYC_FAILED", "Identity verification was not approved", 403, verification);
  }

  // 2) Persist profile
  const [user] = await db
    .insert(userProfiles)
    .values({
      phone: body.phone,
      email: body.email,
      fullName: body.fullName,
      nin: body.nin,
      bushaProfileId: customer.id,
      kycStatus: "VERIFIED",
      trustedDeviceId: deviceId,
    })
    .returning();

  // 3) Pre-verified family recipient (Mama)
  const profileClient = busha.forProfile(customer.id);
  const rcp = await profileClient.createRecipient({
    name: MAMA.label,
    details: {
      bank_code: MAMA.bankCode,
      bank_name: MAMA.bankName,
      account_number: MAMA.accountNumber,
      account_name: MAMA.accountName,
    },
  });
  const existingRcp = await db
    .select()
    .from(trustedRecipients)
    .where(and(eq(trustedRecipients.bushaRecipientId, rcp.id)));
  const [mama] = existingRcp.length
    ? existingRcp
    : await db
        .insert(trustedRecipients)
        .values({ userId: user.id, bushaRecipientId: rcp.id, ...MAMA, isPreVerified: true })
        .returning();

  let seededEntries = 0;
  if (mode === "MOCK" && body.seedHistory) seededEntries = await seedMockInsightsHistory(customer.id);

  return ok(
    {
      created: true,
      profile: publicProfile(user),
      recipients: [publicRecipient(mama)],
      bushaCustomer: customer,
      verification,
      seededInsightsEntries: seededEntries,
    },
    201,
  );
});
