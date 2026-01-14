import { Express, Request, Response } from "express";
import { db } from "./db";
import { eq, and, isNull, desc, sql, count, gte, lte, or } from "drizzle-orm";
import {
    departments,
    users,
    posts,
    mainGoals,
    subgoals,
    programs,
    projects,
    instructions,
    tasks,
    completionReports,
    settings,
    insertDepartmentSchema,
    insertTaskSchema,
    insertCompletionReportSchema,
} from "@shared/schema";

// Helper to get stalled threshold from settings
async function getStalledThreshold(): Promise<number> {
    const setting = await db.query.settings.findFirst({
        where: eq(settings.key, "stalled_threshold_days"),
    });
    return (setting?.value as { days: number })?.days || 3;
}

export function registerRoutes(app: Express) {
    // ============================================================================
    // DEPARTMENTS
    // ============================================================================

    // Get all active departments with head and posts
    app.get("/api/departments", async (req: Request, res: Response) => {
        try {
            const depts = await db.query.departments.findMany({
                where: and(
                    eq(departments.isActive, true),
                    isNull(departments.deletedAt)
                ),
                with: {
                    head: true,
                    posts: {
                        where: eq(posts.isActive, true),
                        with: {
                            user: true,
                        },
                    },
                },
                orderBy: [departments.sortOrder],
            });
            res.json(depts);
        } catch (error) {
            console.error("Error fetching departments:", error);
            res.status(500).json({ error: "Failed to fetch departments" });
        }
    });

    // Create department (CEO/EXECUTIVE only)
    app.post("/api/departments", async (req: Request, res: Response) => {
        try {
            const parsed = insertDepartmentSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ error: "Invalid department data", details: parsed.error });
            }

            const [dept] = await db.insert(departments).values({
                name: parsed.data.name,
                description: parsed.data.description,
            }).returning();

            res.status(201).json(dept);
        } catch (error) {
            console.error("Error creating department:", error);
            res.status(500).json({ error: "Failed to create department" });
        }
    });

    // Update department
    app.put("/api/departments/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            const [updated] = await db
                .update(departments)
                .set({ name, description, updatedAt: new Date() })
                .where(eq(departments.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Department not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating department:", error);
            res.status(500).json({ error: "Failed to update department" });
        }
    });

    // Soft delete department (with validation)
    app.delete("/api/departments/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Check for active tasks
            const activeTasks = await db.query.tasks.findFirst({
                where: eq(tasks.departmentId, id),
            });

            if (activeTasks) {
                return res.status(400).json({
                    error: "Cannot delete department with active tasks. Reassign or complete tasks first."
                });
            }

            // Check for active Ideal Scene elements
            const activeMainGoals = await db.query.mainGoals.findFirst({
                where: and(eq(mainGoals.departmentId, id), eq(mainGoals.isActive, true)),
            });

            if (activeMainGoals) {
                return res.status(400).json({
                    error: "Cannot delete department with active Ideal Scene elements."
                });
            }

            // Soft delete
            const [updated] = await db
                .update(departments)
                .set({ deletedAt: new Date(), isActive: false })
                .where(eq(departments.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Department not found" });
            }

            res.json({ success: true, message: "Department archived" });
        } catch (error) {
            console.error("Error deleting department:", error);
            res.status(500).json({ error: "Failed to delete department" });
        }
    });

    // Set department head
    app.put("/api/departments/:id/head", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { departmentHeadId } = req.body;

            const [updated] = await db
                .update(departments)
                .set({ departmentHeadId, updatedAt: new Date() })
                .where(eq(departments.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Department not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error setting department head:", error);
            res.status(500).json({ error: "Failed to set department head" });
        }
    });

    // ============================================================================
    // POSTS (Positions within departments)
    // ============================================================================

    // Get posts for a department
    app.get("/api/departments/:departmentId/posts", async (req: Request, res: Response) => {
        try {
            const { departmentId } = req.params;

            const postList = await db.query.posts.findMany({
                where: and(
                    eq(posts.departmentId, departmentId),
                    eq(posts.isActive, true)
                ),
                with: {
                    user: true,
                },
                orderBy: [posts.name],
            });

            res.json(postList);
        } catch (error) {
            console.error("Error fetching posts:", error);
            res.status(500).json({ error: "Failed to fetch posts" });
        }
    });

    // Create post
    app.post("/api/posts", async (req: Request, res: Response) => {
        try {
            const { name, description, departmentId, userId } = req.body;

            if (!name || !departmentId) {
                return res.status(400).json({ error: "Name and departmentId are required" });
            }

            const [post] = await db.insert(posts).values({
                name,
                description,
                departmentId,
                userId,
            }).returning();

            res.status(201).json(post);
        } catch (error) {
            console.error("Error creating post:", error);
            res.status(500).json({ error: "Failed to create post" });
        }
    });

    // Update post
    app.put("/api/posts/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description, userId } = req.body;

            const [updated] = await db
                .update(posts)
                .set({
                    name,
                    description,
                    userId,
                    updatedAt: new Date()
                })
                .where(eq(posts.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Post not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating post:", error);
            res.status(500).json({ error: "Failed to update post" });
        }
    });

    // Delete post (soft delete by setting isActive = false)
    app.delete("/api/posts/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const [updated] = await db
                .update(posts)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(posts.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Post not found" });
            }

            res.json({ success: true, message: "Post removed" });
        } catch (error) {
            console.error("Error deleting post:", error);
            res.status(500).json({ error: "Failed to delete post" });
        }
    });

    // ============================================================================
    // MAIN GOALS (Company-wide - for Settings page)
    // ============================================================================

    // Get all main goals (for Settings page)
    app.get("/api/main-goals", async (req: Request, res: Response) => {
        try {
            const goals = await db.query.mainGoals.findMany({
                where: eq(mainGoals.isActive, true),
                with: {
                    department: true,
                },
                orderBy: [mainGoals.createdAt],
            });
            res.json(goals);
        } catch (error) {
            console.error("Error fetching main goals:", error);
            res.status(500).json({ error: "Failed to fetch main goals" });
        }
    });

    // Create main goal (for Settings page - company-wide)
    app.post("/api/main-goals", async (req: Request, res: Response) => {
        try {
            const { title, description } = req.body;

            if (!title) {
                return res.status(400).json({ error: "Title is required" });
            }

            // For company-wide main goal, we need a default department
            // First, get the first active department as fallback
            const defaultDept = await db.query.departments.findFirst({
                where: eq(departments.isActive, true),
                orderBy: [departments.sortOrder],
            });

            if (!defaultDept) {
                return res.status(400).json({ error: "No active departments found" });
            }

            const [goal] = await db.insert(mainGoals).values({
                title,
                description,
                departmentId: defaultDept.id,
            }).returning();

            res.status(201).json(goal);
        } catch (error) {
            console.error("Error creating main goal:", error);
            res.status(500).json({ error: "Failed to create main goal" });
        }
    });

    // Update main goal
    app.put("/api/main-goals/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { title, description } = req.body;

            const [updated] = await db
                .update(mainGoals)
                .set({ title, description, updatedAt: new Date() })
                .where(eq(mainGoals.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Main goal not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating main goal:", error);
            res.status(500).json({ error: "Failed to update main goal" });
        }
    });

    // ============================================================================
    // IDEAL SCENE HIERARCHY
    // ============================================================================

    // Get full Ideal Scene hierarchy
    app.get("/api/ideal-scene", async (req: Request, res: Response) => {
        try {
            const departmentId = req.query.departmentId as string | undefined;

            const whereClause = departmentId
                ? eq(mainGoals.departmentId, departmentId)
                : undefined;

            const goals = await db.query.mainGoals.findMany({
                where: and(whereClause, eq(mainGoals.isActive, true)),
                with: {
                    department: true,
                    subgoals: {
                        where: eq(subgoals.isActive, true),
                        with: {
                            programs: {
                                where: eq(programs.isActive, true),
                                with: {
                                    projects: {
                                        where: eq(projects.isActive, true),
                                        with: {
                                            instructions: {
                                                where: eq(instructions.isActive, true),
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: [mainGoals.createdAt],
            });

            res.json(goals);
        } catch (error) {
            console.error("Error fetching ideal scene:", error);
            res.status(500).json({ error: "Failed to fetch ideal scene" });
        }
    });

    // Create Main Goal (for Ideal Scene - requires departmentId)
    app.post("/api/ideal-scene/main-goals", async (req: Request, res: Response) => {
        try {
            const { title, description, departmentId } = req.body;

            if (!title || !departmentId) {
                return res.status(400).json({ error: "Title and departmentId are required" });
            }

            const [goal] = await db.insert(mainGoals).values({
                title,
                description,
                departmentId,
            }).returning();

            res.status(201).json(goal);
        } catch (error) {
            console.error("Error creating main goal:", error);
            res.status(500).json({ error: "Failed to create main goal" });
        }
    });

    // Create Subgoal
    app.post("/api/ideal-scene/subgoals", async (req: Request, res: Response) => {
        try {
            const { title, description, mainGoalId, departmentId } = req.body;

            if (!title || !mainGoalId || !departmentId) {
                return res.status(400).json({ error: "Title, mainGoalId, and departmentId are required" });
            }

            const [subgoal] = await db.insert(subgoals).values({
                title,
                description,
                mainGoalId,
                departmentId,
            }).returning();

            res.status(201).json(subgoal);
        } catch (error) {
            console.error("Error creating subgoal:", error);
            res.status(500).json({ error: "Failed to create subgoal" });
        }
    });

    // Create Program
    app.post("/api/ideal-scene/programs", async (req: Request, res: Response) => {
        try {
            const { title, description, subgoalId, departmentId } = req.body;

            if (!title || !subgoalId || !departmentId) {
                return res.status(400).json({ error: "Title, subgoalId, and departmentId are required" });
            }

            const [program] = await db.insert(programs).values({
                title,
                description,
                subgoalId,
                departmentId,
            }).returning();

            res.status(201).json(program);
        } catch (error) {
            console.error("Error creating program:", error);
            res.status(500).json({ error: "Failed to create program" });
        }
    });

    // Create Project
    app.post("/api/ideal-scene/projects", async (req: Request, res: Response) => {
        try {
            const { title, description, programId, departmentId } = req.body;

            if (!title || !programId || !departmentId) {
                return res.status(400).json({ error: "Title, programId, and departmentId are required" });
            }

            const [project] = await db.insert(projects).values({
                title,
                description,
                programId,
                departmentId,
            }).returning();

            res.status(201).json(project);
        } catch (error) {
            console.error("Error creating project:", error);
            res.status(500).json({ error: "Failed to create project" });
        }
    });

    // Create Instruction
    app.post("/api/ideal-scene/instructions", async (req: Request, res: Response) => {
        try {
            const { title, description, projectId, departmentId } = req.body;

            if (!title || !projectId || !departmentId) {
                return res.status(400).json({ error: "Title, projectId, and departmentId are required" });
            }

            const [instruction] = await db.insert(instructions).values({
                title,
                description,
                projectId,
                departmentId,
            }).returning();

            res.status(201).json(instruction);
        } catch (error) {
            console.error("Error creating instruction:", error);
            res.status(500).json({ error: "Failed to create instruction" });
        }
    });

    // ============================================================================
    // TASKS
    // ============================================================================

    // Get all tasks (with filters)
    app.get("/api/tasks", async (req: Request, res: Response) => {
        try {
            const { status, departmentId, responsibleUserId, hierarchyLevel } = req.query;

            const conditions = [];
            if (status) conditions.push(eq(tasks.status, status as any));
            if (departmentId) conditions.push(eq(tasks.departmentId, departmentId as string));
            if (responsibleUserId) conditions.push(eq(tasks.responsibleUserId, responsibleUserId as string));
            if (hierarchyLevel) conditions.push(eq(tasks.hierarchyLevel, hierarchyLevel as any));

            const taskList = await db.query.tasks.findMany({
                where: conditions.length > 0 ? and(...conditions) : undefined,
                with: {
                    responsibleUser: true,
                    department: true,
                    completionReport: true,
                },
                orderBy: [desc(tasks.createdAt)],
            });

            res.json(taskList);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            res.status(500).json({ error: "Failed to fetch tasks" });
        }
    });

    // Get single task with full hierarchy context
    app.get("/api/tasks/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const task = await db.query.tasks.findFirst({
                where: eq(tasks.id, id),
                with: {
                    responsibleUser: true,
                    department: true,
                    completionReport: true,
                },
            });

            if (!task) {
                return res.status(404).json({ error: "Task not found" });
            }

            // Get hierarchy context based on hierarchyLevel
            let hierarchyContext: any = {};

            if (task.hierarchyLevel === "INSTRUCTION") {
                const instruction = await db.query.instructions.findFirst({
                    where: eq(instructions.id, task.parentItemId),
                    with: {
                        project: {
                            with: {
                                program: {
                                    with: {
                                        subgoal: {
                                            with: {
                                                mainGoal: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });
                hierarchyContext = {
                    instruction,
                    project: instruction?.project,
                    program: instruction?.project?.program,
                    subgoal: instruction?.project?.program?.subgoal,
                    mainGoal: instruction?.project?.program?.subgoal?.mainGoal,
                };
            } else if (task.hierarchyLevel === "PROJECT") {
                const project = await db.query.projects.findFirst({
                    where: eq(projects.id, task.parentItemId),
                    with: {
                        program: {
                            with: {
                                subgoal: {
                                    with: {
                                        mainGoal: true,
                                    },
                                },
                            },
                        },
                    },
                });
                hierarchyContext = {
                    project,
                    program: project?.program,
                    subgoal: project?.program?.subgoal,
                    mainGoal: project?.program?.subgoal?.mainGoal,
                };
            } else if (task.hierarchyLevel === "PROGRAM") {
                const program = await db.query.programs.findFirst({
                    where: eq(programs.id, task.parentItemId),
                    with: {
                        subgoal: {
                            with: {
                                mainGoal: true,
                            },
                        },
                    },
                });
                hierarchyContext = {
                    program,
                    subgoal: program?.subgoal,
                    mainGoal: program?.subgoal?.mainGoal,
                };
            } else if (task.hierarchyLevel === "SUBGOAL") {
                const subgoal = await db.query.subgoals.findFirst({
                    where: eq(subgoals.id, task.parentItemId),
                    with: {
                        mainGoal: true,
                    },
                });
                hierarchyContext = {
                    subgoal,
                    mainGoal: subgoal?.mainGoal,
                };
            }

            res.json({ ...task, hierarchyContext });
        } catch (error) {
            console.error("Error fetching task:", error);
            res.status(500).json({ error: "Failed to fetch task" });
        }
    });

    // Create task (requires hierarchy context)
    app.post("/api/tasks", async (req: Request, res: Response) => {
        try {
            const {
                title,
                responsibleUserId,
                dueDate,
                departmentId,
                hierarchyLevel,
                parentItemId,
                creatorId
            } = req.body;

            // Validate required fields
            if (!title || !responsibleUserId || !departmentId || !hierarchyLevel || !parentItemId || !creatorId) {
                return res.status(400).json({
                    error: "Missing required fields: title, responsibleUserId, departmentId, hierarchyLevel, parentItemId, creatorId"
                });
            }

            // Validate parent item exists
            let parentExists = false;
            if (hierarchyLevel === "SUBGOAL") {
                parentExists = !!(await db.query.subgoals.findFirst({ where: eq(subgoals.id, parentItemId) }));
            } else if (hierarchyLevel === "PROGRAM") {
                parentExists = !!(await db.query.programs.findFirst({ where: eq(programs.id, parentItemId) }));
            } else if (hierarchyLevel === "PROJECT") {
                parentExists = !!(await db.query.projects.findFirst({ where: eq(projects.id, parentItemId) }));
            } else if (hierarchyLevel === "INSTRUCTION") {
                parentExists = !!(await db.query.instructions.findFirst({ where: eq(instructions.id, parentItemId) }));
            }

            if (!parentExists) {
                return res.status(400).json({ error: "Parent item not found" });
            }

            const [task] = await db.insert(tasks).values({
                title,
                responsibleUserId,
                departmentId,
                hierarchyLevel,
                parentItemId,
                creatorId,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: "TODO",
            }).returning();

            res.status(201).json(task);
        } catch (error) {
            console.error("Error creating task:", error);
            res.status(500).json({ error: "Failed to create task" });
        }
    });

    // Update task status
    app.put("/api/tasks/:id/status", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!["TODO", "DOING", "DONE"].includes(status)) {
                return res.status(400).json({ error: "Invalid status. Must be TODO, DOING, or DONE" });
            }

            // If marking as DONE, require completion report
            if (status === "DONE") {
                const report = await db.query.completionReports.findFirst({
                    where: eq(completionReports.taskId, id),
                });

                if (!report) {
                    return res.status(400).json({
                        error: "Cannot mark as DONE without a completion report. Submit evidence first."
                    });
                }
            }

            const [updated] = await db
                .update(tasks)
                .set({ status, lastUpdatedAt: new Date() })
                .where(eq(tasks.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Task not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating task status:", error);
            res.status(500).json({ error: "Failed to update task status" });
        }
    });

    // Complete task with report
    app.post("/api/tasks/:id/complete", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { whatWasDone, whenDone, whereContext, evidenceType, evidenceUrl, evidenceFileId, submittedById } = req.body;

            // Validate required fields
            if (!whatWasDone || !whenDone || !whereContext || !evidenceType || !submittedById) {
                return res.status(400).json({
                    error: "Missing required fields for completion report"
                });
            }

            // Validate evidence
            if (evidenceType === "URL" && !evidenceUrl) {
                return res.status(400).json({ error: "URL evidence type requires evidenceUrl" });
            }
            if (["FILE", "IMAGE", "DOCUMENT"].includes(evidenceType) && !evidenceFileId) {
                return res.status(400).json({ error: "File-based evidence type requires evidenceFileId" });
            }

            // Reject empty or trivial evidence descriptions
            const trivialResponses = ["ready", "done", "ok", "kész", "finished", "completed"];
            if (trivialResponses.some(t => whatWasDone.toLowerCase().trim() === t)) {
                return res.status(400).json({
                    error: "Completion report must contain meaningful description. 'Ready', 'OK', or 'Kész' is not acceptable."
                });
            }

            // Create completion report
            const [report] = await db.insert(completionReports).values({
                taskId: id,
                whatWasDone,
                whenDone: new Date(whenDone),
                whereContext,
                evidenceType,
                evidenceUrl,
                evidenceFileId,
                submittedById,
            }).returning();

            // Update task status to DONE
            await db
                .update(tasks)
                .set({ status: "DONE", lastUpdatedAt: new Date() })
                .where(eq(tasks.id, id));

            res.status(201).json(report);
        } catch (error) {
            console.error("Error completing task:", error);
            res.status(500).json({ error: "Failed to complete task" });
        }
    });

    // ============================================================================
    // USERS
    // ============================================================================

    app.get("/api/users", async (req: Request, res: Response) => {
        try {
            const userList = await db.query.users.findMany({
                where: eq(users.isActive, true),
                orderBy: [users.name],
            });
            res.json(userList);
        } catch (error) {
            console.error("Error fetching users:", error);
            res.status(500).json({ error: "Failed to fetch users" });
        }
    });

    app.post("/api/users", async (req: Request, res: Response) => {
        try {
            const { email, name, role } = req.body;

            if (!email || !name) {
                return res.status(400).json({ error: "Email and name are required" });
            }

            const [user] = await db.insert(users).values({
                email,
                name,
                role: role || "USER",
            }).returning();

            res.status(201).json(user);
        } catch (error) {
            console.error("Error creating user:", error);
            res.status(500).json({ error: "Failed to create user" });
        }
    });

    // ============================================================================
    // CEO DASHBOARD
    // ============================================================================

    // Summary indicators (KPI cards)
    app.get("/api/dashboard/summary", async (req: Request, res: Response) => {
        try {
            const stalledDays = await getStalledThreshold();
            const stalledDate = new Date();
            stalledDate.setDate(stalledDate.getDate() - stalledDays);

            // Total active tasks
            const totalActive = await db
                .select({ count: count() })
                .from(tasks)
                .where(or(eq(tasks.status, "TODO"), eq(tasks.status, "DOING")));

            // Stalled tasks (DOING with no update for X days)
            const stalledTasks = await db
                .select({ count: count() })
                .from(tasks)
                .where(and(
                    eq(tasks.status, "DOING"),
                    lte(tasks.lastUpdatedAt, stalledDate)
                ));

            // Overdue tasks
            const now = new Date();
            const overdueTasks = await db
                .select({ count: count() })
                .from(tasks)
                .where(and(
                    or(eq(tasks.status, "TODO"), eq(tasks.status, "DOING")),
                    lte(tasks.dueDate, now)
                ));

            // Completed cycles (with reports)
            const completedCycles = await db
                .select({ count: count() })
                .from(tasks)
                .where(eq(tasks.status, "DONE"));

            // Average tasks per post holder
            const userTaskCounts = await db
                .select({
                    userId: tasks.responsibleUserId,
                    taskCount: count()
                })
                .from(tasks)
                .where(or(eq(tasks.status, "TODO"), eq(tasks.status, "DOING")))
                .groupBy(tasks.responsibleUserId);

            const avgTasksPerPost = userTaskCounts.length > 0
                ? userTaskCounts.reduce((sum, u) => sum + Number(u.taskCount), 0) / userTaskCounts.length
                : 0;

            res.json({
                totalActive: Number(totalActive[0]?.count || 0),
                stalledTasks: Number(stalledTasks[0]?.count || 0),
                overdueTasks: Number(overdueTasks[0]?.count || 0),
                completedCycles: Number(completedCycles[0]?.count || 0),
                avgTasksPerPost: Math.round(avgTasksPerPost * 10) / 10,
            });
        } catch (error) {
            console.error("Error fetching dashboard summary:", error);
            res.status(500).json({ error: "Failed to fetch dashboard summary" });
        }
    });

    // Executive grid (users × status breakdown)
    app.get("/api/dashboard/grid", async (req: Request, res: Response) => {
        try {
            const stalledDays = await getStalledThreshold();
            const stalledDate = new Date();
            stalledDate.setDate(stalledDate.getDate() - stalledDays);
            const now = new Date();

            const userList = await db.query.users.findMany({
                where: eq(users.isActive, true),
            });

            const grid = await Promise.all(userList.map(async (user) => {
                const userTasks = await db.query.tasks.findMany({
                    where: eq(tasks.responsibleUserId, user.id),
                });

                const todoCount = userTasks.filter(t => t.status === "TODO").length;
                const doingCount = userTasks.filter(t => t.status === "DOING").length;
                const doneCount = userTasks.filter(t => t.status === "DONE").length;

                const overdueCount = userTasks.filter(t =>
                    (t.status === "TODO" || t.status === "DOING") &&
                    t.dueDate &&
                    new Date(t.dueDate) < now
                ).length;

                const stalledCount = userTasks.filter(t =>
                    t.status === "DOING" &&
                    new Date(t.lastUpdatedAt) < stalledDate
                ).length;

                // Determine flow status
                let flowStatus: "normal" | "overload" | "stalled" = "normal";
                if (stalledCount > 0 || overdueCount > 0) {
                    flowStatus = "stalled";
                } else if (todoCount + doingCount > 10) {
                    flowStatus = "overload";
                }

                return {
                    userId: user.id,
                    userName: user.name,
                    userRole: user.role,
                    todoCount,
                    doingCount,
                    doneCount,
                    overdueCount,
                    stalledCount,
                    flowStatus,
                };
            }));

            res.json(grid);
        } catch (error) {
            console.error("Error fetching dashboard grid:", error);
            res.status(500).json({ error: "Failed to fetch dashboard grid" });
        }
    });

    // Tasks by user and status (for side panel)
    app.get("/api/dashboard/user-tasks/:userId", async (req: Request, res: Response) => {
        try {
            const { userId } = req.params;
            const { status } = req.query;

            const conditions = [eq(tasks.responsibleUserId, userId)];
            if (status) {
                conditions.push(eq(tasks.status, status as any));
            }

            const userTasks = await db.query.tasks.findMany({
                where: and(...conditions),
                with: {
                    department: true,
                    completionReport: true,
                },
                orderBy: [desc(tasks.createdAt)],
            });

            res.json(userTasks);
        } catch (error) {
            console.error("Error fetching user tasks:", error);
            res.status(500).json({ error: "Failed to fetch user tasks" });
        }
    });

    // Department health view
    app.get("/api/dashboard/by-department", async (req: Request, res: Response) => {
        try {
            const stalledDays = await getStalledThreshold();
            const stalledDate = new Date();
            stalledDate.setDate(stalledDate.getDate() - stalledDays);

            const depts = await db.query.departments.findMany({
                where: and(eq(departments.isActive, true), isNull(departments.deletedAt)),
            });

            const result = await Promise.all(depts.map(async (dept) => {
                const deptTasks = await db.query.tasks.findMany({
                    where: eq(tasks.departmentId, dept.id),
                });

                const todoCount = deptTasks.filter(t => t.status === "TODO").length;
                const doingCount = deptTasks.filter(t => t.status === "DOING").length;
                const doneCount = deptTasks.filter(t => t.status === "DONE").length;

                const stalledCount = deptTasks.filter(t =>
                    t.status === "DOING" &&
                    new Date(t.lastUpdatedAt) < stalledDate
                ).length;

                // Check if department has Ideal Scene
                const hasIdealScene = !!(await db.query.mainGoals.findFirst({
                    where: eq(mainGoals.departmentId, dept.id),
                }));

                return {
                    departmentId: dept.id,
                    departmentName: dept.name,
                    todoCount,
                    doingCount,
                    doneCount,
                    stalledCount,
                    hasIdealScene,
                };
            }));

            res.json(result);
        } catch (error) {
            console.error("Error fetching department stats:", error);
            res.status(500).json({ error: "Failed to fetch department stats" });
        }
    });

    // ============================================================================
    // SETTINGS
    // ============================================================================

    app.get("/api/settings", async (req: Request, res: Response) => {
        try {
            const allSettings = await db.query.settings.findMany();
            res.json(allSettings);
        } catch (error) {
            console.error("Error fetching settings:", error);
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    });

    app.put("/api/settings/:key", async (req: Request, res: Response) => {
        try {
            const { key } = req.params;
            const { value } = req.body;

            const [updated] = await db
                .update(settings)
                .set({ value, updatedAt: new Date() })
                .where(eq(settings.key, key))
                .returning();

            if (!updated) {
                // Create if not exists
                const [created] = await db.insert(settings).values({ key, value }).returning();
                return res.json(created);
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating setting:", error);
            res.status(500).json({ error: "Failed to update setting" });
        }
    });

    // Health check
    app.get("/api/health", (req: Request, res: Response) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
}
