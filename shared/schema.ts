import { sql } from "drizzle-orm";
import {
    pgTable,
    text,
    varchar,
    integer,
    timestamp,
    boolean,
    jsonb,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

// Task status - ONLY 3 statuses, no exceptions
export const taskStatusEnum = pgEnum("task_status", ["TODO", "DOING", "DONE"]);

// Hierarchy level - what type of Ideal Scene element a task belongs to
export const hierarchyLevelEnum = pgEnum("hierarchy_level", [
    "SUBGOAL",
    "PLAN",
    "PROGRAM",
    "PROJECT",
    "INSTRUCTION"
]);

// User role - for authorization
export const userRoleEnum = pgEnum("user_role", ["CEO", "EXECUTIVE", "USER"]);

// Evidence type for completion reports
export const evidenceTypeEnum = pgEnum("evidence_type", [
    "FILE",
    "IMAGE",
    "URL",
    "DOCUMENT",
    "RECEIPT",
    "SIGNED_NOTE"
]);

// ============================================================================
// SESSIONS (for authentication)
// ============================================================================

export const sessions = pgTable(
    "sessions",
    {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire", { withTimezone: true }).notNull(),
    },
    (table) => [index("IDX_session_expire").on(table.expire)]
);

// ============================================================================
// USERS (Post Holders)
// ============================================================================

export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique().notNull(),
    name: varchar("name").notNull(),
    password: varchar("password"), // For local auth (optional)
    microsoftId: varchar("microsoft_id").unique(), // Microsoft OAuth ID
    avatarUrl: varchar("avatar_url"), // Profile picture from Microsoft
    role: userRoleEnum("role").default("USER").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isPending: boolean("is_pending").default(false).notNull(), // True when user is invited but hasn't accepted yet
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
    tasks: many(tasks),
    createdTasks: many(tasks, { relationName: "taskCreator" }),
    sentInvitations: many(invitations),
}));

// ============================================================================
// INVITATIONS (Team member email invitations)
// ============================================================================

export const invitations = pgTable(
    "invitations",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        email: varchar("email").notNull(),
        role: userRoleEnum("role").default("USER").notNull(),
        token: varchar("token").unique().notNull(),
        invitedById: varchar("invited_by_id").references(() => users.id),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        acceptedAt: timestamp("accepted_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_invitations_email").on(table.email),
        index("idx_invitations_token").on(table.token),
    ]
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
    invitedBy: one(users, {
        fields: [invitations.invitedById],
        references: [users.id],
    }),
}));

// ============================================================================
// DEPARTMENTS (with soft delete and audit trail)
// ============================================================================

export const departments = pgTable("departments", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    // Sort order for correct LRH department sequence
    sortOrder: integer("sort_order").default(0).notNull(),
    // Department head - who is responsible for this department
    departmentHeadId: varchar("department_head_id").references(() => users.id),
    isActive: boolean("is_active").default(true).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const departmentsRelations = relations(departments, ({ one, many }) => ({
    head: one(users, {
        fields: [departments.departmentHeadId],
        references: [users.id],
    }),
    posts: many(posts),
    mainGoals: many(mainGoals),
    subgoals: many(subgoals),
    programs: many(programs),
    projects: many(projects),
    instructions: many(instructions),
    tasks: many(tasks),
}));

// ============================================================================
// POSTS (Positions within departments)
// ============================================================================

export const posts = pgTable(
    "posts",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        name: varchar("name").notNull(), // Post name: "Secretary", "Accountant", etc.
        description: text("description"),
        departmentId: varchar("department_id")
            .references(() => departments.id)
            .notNull(),
        // Who holds this post (can be null if vacant)
        userId: varchar("user_id").references(() => users.id),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_posts_department").on(table.departmentId),
        index("idx_posts_user").on(table.userId),
    ]
);

export const postsRelations = relations(posts, ({ one }) => ({
    department: one(departments, {
        fields: [posts.departmentId],
        references: [departments.id],
    }),
    user: one(users, {
        fields: [posts.userId],
        references: [users.id],
    }),
}));

// ============================================================================
// IDEAL SCENE HIERARCHY
// Level 1: Main Goal (Főcél) - Company-wide goals
// ============================================================================

export const mainGoals = pgTable(
    "main_goals",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),
        description: text("description"),
        departmentId: varchar("department_id").references(() => departments.id).notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index("idx_main_goals_department").on(table.departmentId)]
);

export const mainGoalsRelations = relations(mainGoals, ({ one, many }) => ({
    department: one(departments, {
        fields: [mainGoals.departmentId],
        references: [departments.id],
    }),
    subgoals: many(subgoals),
}));

// ============================================================================
// Level 2: Subgoal (Alcél)
// ============================================================================

export const subgoals = pgTable(
    "subgoals",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),
        description: text("description"),
        mainGoalId: varchar("main_goal_id").references(() => mainGoals.id).notNull(),
        departmentId: varchar("department_id").references(() => departments.id).notNull(),
        assignedUserId: varchar("assigned_user_id").references(() => users.id),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_subgoals_main_goal").on(table.mainGoalId),
        index("idx_subgoals_department").on(table.departmentId),
    ]
);

export const subgoalsRelations = relations(subgoals, ({ one, many }) => ({
    mainGoal: one(mainGoals, {
        fields: [subgoals.mainGoalId],
        references: [mainGoals.id],
    }),
    department: one(departments, {
        fields: [subgoals.departmentId],
        references: [departments.id],
    }),
    assignedUser: one(users, {
        fields: [subgoals.assignedUserId],
        references: [users.id],
    }),
    plans: many(plans),
    tasks: many(tasks, { relationName: "subgoalTasks" }),
}));

// ============================================================================
// Level 3: Plan (Terv) - Strategic plans for achieving subgoals
// ============================================================================

export const plans = pgTable(
    "plans",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),
        description: text("description"),
        subgoalId: varchar("subgoal_id").references(() => subgoals.id).notNull(),
        departmentId: varchar("department_id").references(() => departments.id).notNull(),
        assignedUserId: varchar("assigned_user_id").references(() => users.id),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_plans_subgoal").on(table.subgoalId),
        index("idx_plans_department").on(table.departmentId),
    ]
);

export const plansRelations = relations(plans, ({ one, many }) => ({
    subgoal: one(subgoals, {
        fields: [plans.subgoalId],
        references: [subgoals.id],
    }),
    department: one(departments, {
        fields: [plans.departmentId],
        references: [departments.id],
    }),
    assignedUser: one(users, {
        fields: [plans.assignedUserId],
        references: [users.id],
    }),
    programs: many(programs),
    tasks: many(tasks, { relationName: "planTasks" }),
}));

// ============================================================================
// Level 4: Program
// ============================================================================

export const programs = pgTable(
    "programs",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),
        description: text("description"),
        planId: varchar("plan_id").references(() => plans.id).notNull(),
        departmentId: varchar("department_id").references(() => departments.id).notNull(),
        assignedUserId: varchar("assigned_user_id").references(() => users.id),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_programs_plan").on(table.planId),
        index("idx_programs_department").on(table.departmentId),
    ]
);

export const programsRelations = relations(programs, ({ one, many }) => ({
    plan: one(plans, {
        fields: [programs.planId],
        references: [plans.id],
    }),
    department: one(departments, {
        fields: [programs.departmentId],
        references: [departments.id],
    }),
    assignedUser: one(users, {
        fields: [programs.assignedUserId],
        references: [users.id],
    }),
    projects: many(projects),
    tasks: many(tasks, { relationName: "programTasks" }),
}));

// ============================================================================
// Level 4: Project
// ============================================================================

export const projects = pgTable(
    "projects",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),
        description: text("description"),
        programId: varchar("program_id").references(() => programs.id).notNull(),
        departmentId: varchar("department_id").references(() => departments.id).notNull(),
        assignedUserId: varchar("assigned_user_id").references(() => users.id),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_projects_program").on(table.programId),
        index("idx_projects_department").on(table.departmentId),
    ]
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
    program: one(programs, {
        fields: [projects.programId],
        references: [programs.id],
    }),
    department: one(departments, {
        fields: [projects.departmentId],
        references: [departments.id],
    }),
    assignedUser: one(users, {
        fields: [projects.assignedUserId],
        references: [users.id],
    }),
    instructions: many(instructions),
    tasks: many(tasks, { relationName: "projectTasks" }),
}));

// ============================================================================
// Level 5: Instruction
// ============================================================================

export const instructions = pgTable(
    "instructions",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),
        description: text("description"),
        projectId: varchar("project_id").references(() => projects.id).notNull(),
        departmentId: varchar("department_id").references(() => departments.id).notNull(),
        assignedUserId: varchar("assigned_user_id").references(() => users.id),
        isActive: boolean("is_active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_instructions_project").on(table.projectId),
        index("idx_instructions_department").on(table.departmentId),
    ]
);

export const instructionsRelations = relations(instructions, ({ one, many }) => ({
    project: one(projects, {
        fields: [instructions.projectId],
        references: [projects.id],
    }),
    department: one(departments, {
        fields: [instructions.departmentId],
        references: [departments.id],
    }),
    assignedUser: one(users, {
        fields: [instructions.assignedUserId],
        references: [users.id],
    }),
    tasks: many(tasks, { relationName: "instructionTasks" }),
}));

// ============================================================================
// TASKS (Action steps - NOT goals)
// ============================================================================

export const tasks = pgTable(
    "tasks",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        title: varchar("title").notNull(),

        // Exactly ONE responsible person - never multiple
        responsibleUserId: varchar("responsible_user_id")
            .references(() => users.id)
            .notNull(),

        // Only 3 statuses: TODO, DOING, DONE
        status: taskStatusEnum("status").default("TODO").notNull(),

        // Optional due date
        dueDate: timestamp("due_date", { withTimezone: true }),

        // Department - mandatory
        departmentId: varchar("department_id")
            .references(() => departments.id)
            .notNull(),

        // Hierarchy context - mandatory
        hierarchyLevel: hierarchyLevelEnum("hierarchy_level").notNull(),

        // Parent item reference - depends on hierarchyLevel
        // This is the ID of the parent subgoal/program/project/instruction
        parentItemId: varchar("parent_item_id").notNull(),

        // Creator
        creatorId: varchar("creator_id")
            .references(() => users.id)
            .notNull(),

        // Last updated - for stalled detection
        lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_tasks_responsible").on(table.responsibleUserId),
        index("idx_tasks_status").on(table.status),
        index("idx_tasks_department").on(table.departmentId),
        index("idx_tasks_hierarchy").on(table.hierarchyLevel, table.parentItemId),
        index("idx_tasks_due_date").on(table.dueDate),
        index("idx_tasks_last_updated").on(table.lastUpdatedAt),
    ]
);

export const tasksRelations = relations(tasks, ({ one }) => ({
    responsibleUser: one(users, {
        fields: [tasks.responsibleUserId],
        references: [users.id],
    }),
    creator: one(users, {
        fields: [tasks.creatorId],
        references: [users.id],
        relationName: "taskCreator",
    }),
    department: one(departments, {
        fields: [tasks.departmentId],
        references: [departments.id],
    }),
    completionReport: one(completionReports),
}));

// ============================================================================
// COMPLETION REPORTS (Mandatory for DONE status)
// ============================================================================

export const completionReports = pgTable(
    "completion_reports",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

        // 1:1 relationship with task
        taskId: varchar("task_id")
            .references(() => tasks.id, { onDelete: "cascade" })
            .notNull()
            .unique(),

        // What was done - brief factual statement
        whatWasDone: text("what_was_done").notNull(),

        // When it was done
        whenDone: timestamp("when_done", { withTimezone: true }).notNull(),

        // Where / in what context
        whereContext: text("where_context").notNull(),

        // Evidence - MANDATORY
        evidenceType: evidenceTypeEnum("evidence_type").notNull(),
        evidenceUrl: text("evidence_url"), // For URLs/links
        evidenceFileId: varchar("evidence_file_id"), // For uploaded files
        evidenceFileName: varchar("evidence_file_name"), // Original filename

        // Who submitted
        submittedById: varchar("submitted_by_id")
            .references(() => users.id)
            .notNull(),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        index("idx_completion_reports_task").on(table.taskId),
        index("idx_completion_reports_submitted_by").on(table.submittedById),
    ]
);

export const completionReportsRelations = relations(completionReports, ({ one }) => ({
    task: one(tasks, {
        fields: [completionReports.taskId],
        references: [tasks.id],
    }),
    submittedBy: one(users, {
        fields: [completionReports.submittedById],
        references: [users.id],
    }),
}));

// ============================================================================
// FILE UPLOADS (for evidence)
// ============================================================================

export const uploads = pgTable(
    "uploads",
    {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        fileName: varchar("file_name").notNull(),
        originalName: varchar("original_name").notNull(),
        mimeType: varchar("mime_type").notNull(),
        size: integer("size").notNull(), // in bytes
        path: varchar("path").notNull(),
        uploadedById: varchar("uploaded_by_id")
            .references(() => users.id)
            .notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [index("idx_uploads_uploaded_by").on(table.uploadedById)]
);

// ============================================================================
// SYSTEM SETTINGS (for stalled threshold, etc.)
// ============================================================================

export const settings = pgTable("settings", {
    key: varchar("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// User schemas
export const insertUserSchema = createInsertSchema(users, {
    email: z.string().email(),
    name: z.string().min(1).max(100),
});
export const selectUserSchema = createSelectSchema(users);

// Department schemas
export const insertDepartmentSchema = createInsertSchema(departments, {
    name: z.string().min(1).max(100),
});
export const selectDepartmentSchema = createSelectSchema(departments);

// Task schemas
export const insertTaskSchema = createInsertSchema(tasks, {
    title: z.string().min(1).max(500),
});
export const selectTaskSchema = createSelectSchema(tasks);

// Completion report schemas
export const insertCompletionReportSchema = createInsertSchema(completionReports, {
    whatWasDone: z.string().min(10, "Description must be at least 10 characters"),
    whereContext: z.string().min(3, "Context must be at least 3 characters"),
});
export const selectCompletionReportSchema = createSelectSchema(completionReports);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

export type MainGoal = typeof mainGoals.$inferSelect;
export type InsertMainGoal = typeof mainGoals.$inferInsert;

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

export type Subgoal = typeof subgoals.$inferSelect;
export type InsertSubgoal = typeof subgoals.$inferInsert;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

export type Program = typeof programs.$inferSelect;
export type InsertProgram = typeof programs.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type Instruction = typeof instructions.$inferSelect;
export type InsertInstruction = typeof instructions.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export type CompletionReport = typeof completionReports.$inferSelect;
export type InsertCompletionReport = typeof completionReports.$inferInsert;

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

export type TaskStatus = "TODO" | "DOING" | "DONE";
export type HierarchyLevel = "SUBGOAL" | "PLAN" | "PROGRAM" | "PROJECT" | "INSTRUCTION";
export type UserRole = "CEO" | "EXECUTIVE" | "USER";
export type EvidenceType = "FILE" | "IMAGE" | "URL" | "DOCUMENT" | "RECEIPT" | "SIGNED_NOTE";
