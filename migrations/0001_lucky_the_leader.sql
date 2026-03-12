CREATE TYPE "public"."journey_step" AS ENUM('DECISION', 'CONSOLIDATION', 'ENCOUNTER', 'POST_ENCOUNTER', 'SCHOOL_OF_LEADERS', 'PRE_REENTRY', 'SENDING');--> statement-breakpoint
CREATE TABLE "journey_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"old_step" "journey_step",
	"new_step" "journey_step" NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar(255) NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"birth_date" timestamp NOT NULL,
	"gender" varchar(1) NOT NULL,
	"leader_id" uuid,
	"current_step" "journey_step" DEFAULT 'DECISION' NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "counter" CASCADE;--> statement-breakpoint
ALTER TABLE "journey_history" ADD CONSTRAINT "journey_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_leader_id_members_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_org_idx" ON "members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_leader_idx" ON "members" USING btree ("leader_id");