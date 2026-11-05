import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Money columns: exact decimal in Postgres, surfaced as JS number. */
const money = (name: string) =>
  numeric(name, { precision: 24, scale: 6, mode: "number" });

// ---------------------------------------------------------------------------
// Spec models (mirrors the original Prisma schema)
// ---------------------------------------------------------------------------

export const userProfiles = pgTable("user_profiles", {
  id: id(),
  phone: text("phone").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  nin: text("nin").notNull(),
  bushaProfileId: text("busha_profile_id").notNull().unique(),
  kycStatus: text("kyc_status").notNull().default("VERIFIED"),
  autoSavePercent: integer("auto_save_percent").notNull().default(15),
  trustedDeviceId: text("trusted_device_id")
    .notNull()
    .default("DEV_TUNDE_IPHONE_01"),
  simSwapLockedUntil: timestamp("sim_swap_locked_until", {
    withTimezone: true,
  }),
  createdAt: createdAt(),
});

export const trustedRecipients = pgTable(
  "trusted_recipients",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    bushaRecipientId: text("busha_recipient_id").notNull().unique(),
    label: text("label").notNull(),
    bankName: text("bank_name").notNull(),
    bankCode: text("bank_code").notNull(),
    accountNumber: text("account_number").notNull(),
    accountName: text("account_name").notNull(),
    isPreVerified: boolean("is_pre_verified").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("trusted_recipients_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Additions: ledger, telemetry, webhook idempotency, mock sandbox state
// ---------------------------------------------------------------------------

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    /** DEPOSIT | AUTO_SAVE | CONVERSION | PAYOUT | PLEDGE_ADVANCE */
    kind: text("kind").notNull(),
    /** IN | OUT | INTERNAL */
    direction: text("direction").notNull(),
    currency: text("currency").notNull(),
    amount: money("amount").notNull(),
    counterCurrency: text("counter_currency"),
    counterAmount: money("counter_amount"),
    status: text("status").notNull(),
    description: text("description").notNull(),
    bushaTransferId: text("busha_transfer_id"),
    bushaQuoteId: text("busha_quote_id"),
    recipientId: text("recipient_id").references(() => trustedRecipients.id, {
      onDelete: "set null",
    }),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_created_idx").on(t.userId, t.createdAt),
    index("transactions_busha_transfer_idx").on(t.bushaTransferId),
  ],
);

export const apiLogs = pgTable(
  "api_logs",
  {
    id: id(),
    /** OUTGOING | INCOMING_WEBHOOK | GUARD | SIMULATOR */
    direction: text("direction").notNull(),
    /** MOCK | LIVE */
    mode: text("mode").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status"),
    durationMs: integer("duration_ms"),
    profileId: text("profile_id"),
    requestHeaders: jsonb("request_headers").$type<Record<string, string>>(),
    requestBody: jsonb("request_body"),
    responseBody: jsonb("response_body"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("api_logs_created_idx").on(t.createdAt)],
);

export const processedWebhooks = pgTable("processed_webhooks", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  createdAt: createdAt(),
});

/** One JSONB document per Busha profile — the MOCK sandbox's "Busha database". */
export const mockBushaState = pgTable("mock_busha_state", {
  profileId: text("profile_id").primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  recipients: many(trustedRecipients),
  transactions: many(transactions),
}));

export const trustedRecipientsRelations = relations(
  trustedRecipients,
  ({ one }) => ({
    user: one(userProfiles, {
      fields: [trustedRecipients.userId],
      references: [userProfiles.id],
    }),
  }),
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(userProfiles, {
    fields: [transactions.userId],
    references: [userProfiles.id],
  }),
  recipient: one(trustedRecipients, {
    fields: [transactions.recipientId],
    references: [trustedRecipients.id],
  }),
}));

export type UserProfile = typeof userProfiles.$inferSelect;
export type TrustedRecipient = typeof trustedRecipients.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type ApiLog = typeof apiLogs.$inferSelect;
