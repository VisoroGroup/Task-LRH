CREATE TYPE "public"."policy_scope" AS ENUM('COMPANY', 'DEPARTMENT', 'POST');--> statement-breakpoint
CREATE TYPE "public"."recurrence_type" AS ENUM('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TABLE "policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"scope" "policy_scope" DEFAULT 'POST' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_departments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" varchar NOT NULL,
	"department_id" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" varchar NOT NULL,
	"post_id" varchar NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "is_recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_type" "recurrence_type" DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_interval" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_day_of_week" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_day_of_month" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurrence_end_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_recurring_task_id" varchar;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "occurrence_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "microsoft_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "microsoft_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "microsoft_token_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_departments" ADD CONSTRAINT "policy_departments_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_departments" ADD CONSTRAINT "policy_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_posts" ADD CONSTRAINT "policy_posts_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_posts" ADD CONSTRAINT "policy_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_policies_scope" ON "policies" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_policies_created_by" ON "policies" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "idx_policy_departments_policy" ON "policy_departments" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "idx_policy_departments_department" ON "policy_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "idx_policy_posts_policy" ON "policy_posts" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "idx_policy_posts_post" ON "policy_posts" USING btree ("post_id");