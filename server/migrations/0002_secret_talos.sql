ALTER TABLE "instructions" DROP CONSTRAINT "instructions_assigned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "plans" DROP CONSTRAINT "plans_assigned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "programs" DROP CONSTRAINT "programs_assigned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_assigned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "subgoals" DROP CONSTRAINT "subgoals_assigned_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_responsible_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_tasks_responsible";--> statement-breakpoint
ALTER TABLE "instructions" ADD COLUMN "assigned_post_id" varchar;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "assigned_post_id" varchar;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "assigned_post_id" varchar;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "assigned_post_id" varchar;--> statement-breakpoint
ALTER TABLE "subgoals" ADD COLUMN "assigned_post_id" varchar;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "responsible_post_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_assigned_post_id_posts_id_fk" FOREIGN KEY ("assigned_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plans" ADD CONSTRAINT "plans_assigned_post_id_posts_id_fk" FOREIGN KEY ("assigned_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_assigned_post_id_posts_id_fk" FOREIGN KEY ("assigned_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_assigned_post_id_posts_id_fk" FOREIGN KEY ("assigned_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subgoals" ADD CONSTRAINT "subgoals_assigned_post_id_posts_id_fk" FOREIGN KEY ("assigned_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_responsible_post_id_posts_id_fk" FOREIGN KEY ("responsible_post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_responsible_post" ON "tasks" USING btree ("responsible_post_id");--> statement-breakpoint
ALTER TABLE "instructions" DROP COLUMN "assigned_user_id";--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "assigned_user_id";--> statement-breakpoint
ALTER TABLE "programs" DROP COLUMN "assigned_user_id";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "assigned_user_id";--> statement-breakpoint
ALTER TABLE "subgoals" DROP COLUMN "assigned_user_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "responsible_user_id";