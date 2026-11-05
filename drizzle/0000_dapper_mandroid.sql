CREATE TABLE "api_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"direction" text NOT NULL,
	"mode" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" integer,
	"duration_ms" integer,
	"profile_id" text,
	"request_headers" jsonb,
	"request_body" jsonb,
	"response_body" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_busha_state" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"direction" text NOT NULL,
	"currency" text NOT NULL,
	"amount" numeric(24, 6) NOT NULL,
	"counter_currency" text,
	"counter_amount" numeric(24, 6),
	"status" text NOT NULL,
	"description" text NOT NULL,
	"busha_transfer_id" text,
	"busha_quote_id" text,
	"recipient_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"busha_recipient_id" text NOT NULL,
	"label" text NOT NULL,
	"bank_name" text NOT NULL,
	"bank_code" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"is_pre_verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trusted_recipients_busha_recipient_id_unique" UNIQUE("busha_recipient_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"nin" text NOT NULL,
	"busha_profile_id" text NOT NULL,
	"kyc_status" text DEFAULT 'VERIFIED' NOT NULL,
	"auto_save_percent" integer DEFAULT 15 NOT NULL,
	"trusted_device_id" text DEFAULT 'DEV_TUNDE_IPHONE_01' NOT NULL,
	"sim_swap_locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_phone_unique" UNIQUE("phone"),
	CONSTRAINT "user_profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "user_profiles_busha_profile_id_unique" UNIQUE("busha_profile_id")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recipient_id_trusted_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."trusted_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_recipients" ADD CONSTRAINT "trusted_recipients_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_logs_created_idx" ON "api_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_user_created_idx" ON "transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "transactions_busha_transfer_idx" ON "transactions" USING btree ("busha_transfer_id");--> statement-breakpoint
CREATE INDEX "trusted_recipients_user_idx" ON "trusted_recipients" USING btree ("user_id");