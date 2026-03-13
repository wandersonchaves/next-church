CREATE TYPE "public"."gender" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TABLE "member_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"member_id" uuid NOT NULL,
	"step" "journey_step" NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"validated_by_id" uuid,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "journey_history" ALTER COLUMN "old_step" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "journey_history" ALTER COLUMN "new_step" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "member_journeys" ALTER COLUMN "step" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "current_step" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "current_step" SET DEFAULT 'DECISION'::text;--> statement-breakpoint
DROP TYPE "public"."journey_step";--> statement-breakpoint
CREATE TYPE "public"."journey_step" AS ENUM('DECISION', 'CELL', 'UNIVERSITY_OF_LIFE', 'ENCOUNTER', 'LEADERSHIP_TRAINING', 'RE_ENCOUNTER', 'SENDING');--> statement-breakpoint
ALTER TABLE "journey_history" ALTER COLUMN "old_step" SET DATA TYPE "public"."journey_step" USING "old_step"::"public"."journey_step";--> statement-breakpoint
ALTER TABLE "journey_history" ALTER COLUMN "new_step" SET DATA TYPE "public"."journey_step" USING "new_step"::"public"."journey_step";--> statement-breakpoint
ALTER TABLE "member_journeys" ALTER COLUMN "step" SET DATA TYPE "public"."journey_step" USING "step"::"public"."journey_step";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "current_step" SET DEFAULT 'DECISION'::"public"."journey_step";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "current_step" SET DATA TYPE "public"."journey_step" USING "current_step"::"public"."journey_step";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "gender" SET DATA TYPE "public"."gender" USING "gender"::"public"."gender";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "lineage" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "is_baptized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "kids_notes" text;--> statement-breakpoint
ALTER TABLE "member_journeys" ADD CONSTRAINT "member_journeys_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_journeys" ADD CONSTRAINT "member_journeys_validated_by_id_members_id_fk" FOREIGN KEY ("validated_by_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journey_org_idx" ON "member_journeys" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "journey_member_idx" ON "member_journeys" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_lineage_idx" ON "members" USING btree ("lineage");