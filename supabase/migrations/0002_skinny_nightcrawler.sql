CREATE TABLE "generation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prospect_id" uuid,
	"message_type" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_logs_type_valid" CHECK ("generation_logs"."message_type" IN ('instagram_dm', 'cold_email', 'follow_up', 'custom'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "sender_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "agency_website" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "agency_value_props" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "agency_services" text[];--> statement-breakpoint
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_prospect_id_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_logs_user_idx" ON "generation_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_logs_user_created_idx" ON "generation_logs" USING btree ("user_id","created_at");