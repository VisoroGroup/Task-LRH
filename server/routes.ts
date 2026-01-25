import { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Client as ObjectStorageClient } from "@replit/object-storage";
import { db } from "./db";
import { eq, and, isNull, desc, sql, count, gte, lte, or } from "drizzle-orm";
import {
    departments,
    users,
    posts,
    mainGoals,
    subgoals,
    plans,
    programs,
    projects,
    instructions,
    tasks,
    completionReports,
    settings,
    invitations,
    policies,
    policyPosts,
    policyDepartments,
    insertDepartmentSchema,
    insertTaskSchema,
    insertCompletionReportSchema,
    insertPolicySchema,
} from "@shared/schema";
import { syncTaskToCalendar, syncAllTasksToCalendar, hasCalendarConnected } from "./calendar";

// Helper to get stalled threshold from settings
async function getStalledThreshold(): Promise<number> {
    const setting = await db.query.settings.findFirst({
        where: eq(settings.key, "stalled_threshold_days"),
    });
    return (setting?.value as { days: number })?.days || 3;
}
// Multer configuration for avatar uploads
const uploadDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize Replit Object Storage client (only in Replit environment)
let objectStorageClient: ObjectStorageClient | null = null;
if (process.env.REPLIT_DB_URL || process.env.REPL_ID) {
    try {
        objectStorageClient = new ObjectStorageClient();
        console.log("Replit Object Storage initialized");
    } catch (err) {
        console.log("Object Storage not available, using local filesystem");
    }
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const userId = req.params.id;
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `${userId}-${Date.now()}${ext}`);
    },
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    },
});

export function registerRoutes(app: Express) {
    // ============================================================================
    // OBJECT STORAGE FILE SERVING (Replit persistent storage)
    // ============================================================================
    app.get("/objstorage/*", async (req: Request, res: Response) => {
        const objectName = req.path.replace("/objstorage/", "");

        if (!objectStorageClient) {
            return res.status(404).json({ error: "Object Storage not available" });
        }

        try {
            const result = await objectStorageClient.downloadAsBytes(objectName);

            if (result.error) {
                return res.status(404).json({ error: "File not found" });
            }

            // Set content type based on file extension
            const ext = path.extname(objectName).toLowerCase();
            const contentTypes: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
            };

            res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.send(result.value);
        } catch (error) {
            console.error("Error serving object:", error);
            res.status(500).json({ error: "Failed to serve file" });
        }
    });

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
                            assignedUser: true,
                            plans: {
                                where: eq(plans.isActive, true),
                                with: {
                                    assignedUser: true,
                                    programs: {
                                        where: eq(programs.isActive, true),
                                        with: {
                                            assignedUser: true,
                                            projects: {
                                                where: eq(projects.isActive, true),
                                                with: {
                                                    assignedUser: true,
                                                    instructions: {
                                                        where: eq(instructions.isActive, true),
                                                        with: {
                                                            assignedUser: true,
                                                        },
                                                    },
                                                },
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

    // Update Main Goal Ideal Scene Content
    app.put("/api/ideal-scene/main-goals/:id/content", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { idealSceneContent } = req.body;

            const [updated] = await db.update(mainGoals)
                .set({
                    idealSceneContent,
                    updatedAt: new Date()
                })
                .where(eq(mainGoals.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Main goal not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating ideal scene content:", error);
            res.status(500).json({ error: "Failed to update ideal scene content" });
        }
    });

    // Create Subgoal
    app.post("/api/ideal-scene/subgoals", async (req: Request, res: Response) => {
        try {
            const { title, description, mainGoalId, departmentId, assignedUserId, dueDate } = req.body;

            if (!title || !mainGoalId || !departmentId || !dueDate) {
                return res.status(400).json({ error: "Title, mainGoalId, departmentId, and dueDate are required" });
            }

            const [subgoal] = await db.insert(subgoals).values({
                title,
                description,
                mainGoalId,
                departmentId,
                assignedUserId: assignedUserId || null,
                dueDate: new Date(dueDate),
            }).returning();

            res.status(201).json(subgoal);
        } catch (error) {
            console.error("Error creating subgoal:", error);
            res.status(500).json({ error: "Failed to create subgoal" });
        }
    });

    // Create Plan (Terv)
    app.post("/api/ideal-scene/plans", async (req: Request, res: Response) => {
        try {
            let { title, description, subgoalId, departmentId, assignedUserId, dueDate } = req.body;

            if (!title || !subgoalId || !dueDate) {
                return res.status(400).json({ error: "Title, subgoalId, and dueDate are required" });
            }

            // Auto-select department from subgoal or first department if not provided
            if (!departmentId) {
                const subgoal = await db.query.subgoals.findFirst({
                    where: eq(subgoals.id, subgoalId),
                });
                departmentId = subgoal?.departmentId;

                if (!departmentId) {
                    const [firstDept] = await db.select().from(departments).limit(1);
                    departmentId = firstDept?.id;
                }
            }

            const [plan] = await db.insert(plans).values({
                title,
                description,
                subgoalId,
                departmentId,
                assignedUserId: assignedUserId || null,
                dueDate: new Date(dueDate),
            }).returning();

            res.status(201).json(plan);
        } catch (error) {
            console.error("Error creating plan:", error);
            res.status(500).json({ error: "Failed to create plan" });
        }
    });

    // Get plans by subgoalId
    app.get("/api/plans", async (req: Request, res: Response) => {
        try {
            const subgoalId = req.query.subgoalId as string | undefined;

            const planList = await db.query.plans.findMany({
                where: subgoalId
                    ? and(eq(plans.subgoalId, subgoalId), eq(plans.isActive, true))
                    : eq(plans.isActive, true),
                with: {
                    subgoal: true,
                    department: true,
                },
                orderBy: [plans.createdAt],
            });

            res.json(planList);
        } catch (error) {
            console.error("Error fetching plans:", error);
            res.status(500).json({ error: "Failed to fetch plans" });
        }
    });

    // Create Program (now references planId instead of subgoalId)
    app.post("/api/ideal-scene/programs", async (req: Request, res: Response) => {
        try {
            let { title, description, planId, departmentId, assignedUserId, dueDate } = req.body;

            if (!title || !planId || !dueDate) {
                return res.status(400).json({ error: "Title, planId, and dueDate are required" });
            }

            // Auto-select first department if not provided
            if (!departmentId) {
                const [firstDept] = await db.select().from(departments).limit(1);
                departmentId = firstDept?.id;
            }

            const [program] = await db.insert(programs).values({
                title,
                description,
                planId,
                departmentId,
                assignedUserId: assignedUserId || null,
                dueDate: new Date(dueDate),
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
            let { title, description, programId, departmentId, assignedUserId, dueDate } = req.body;

            if (!title || !programId || !dueDate) {
                return res.status(400).json({ error: "Title, programId, and dueDate are required" });
            }

            // Auto-select first department if not provided
            if (!departmentId) {
                const [firstDept] = await db.select().from(departments).limit(1);
                departmentId = firstDept?.id;
            }

            const [project] = await db.insert(projects).values({
                title,
                description,
                programId,
                departmentId,
                assignedUserId: assignedUserId || null,
                dueDate: new Date(dueDate),
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
            let { title, description, projectId, departmentId, assignedUserId, dueDate } = req.body;

            if (!title || !projectId || !dueDate) {
                return res.status(400).json({ error: "Title, projectId, and dueDate are required" });
            }

            // Auto-select first department if not provided
            if (!departmentId) {
                const [firstDept] = await db.select().from(departments).limit(1);
                departmentId = firstDept?.id;
            }

            const [instruction] = await db.insert(instructions).values({
                title,
                description,
                projectId,
                departmentId,
                assignedUserId: assignedUserId || null,
                dueDate: new Date(dueDate),
            }).returning();

            res.status(201).json(instruction);
        } catch (error) {
            console.error("Error creating instruction:", error);
            res.status(500).json({ error: "Failed to create instruction" });
        }
    });

    // Update hierarchy item owner
    app.put("/api/ideal-scene/:type/:id/owner", async (req: Request, res: Response) => {
        try {
            const { type, id } = req.params;
            const { assignedUserId } = req.body;

            let result;
            switch (type) {
                case "subgoals":
                    [result] = await db.update(subgoals)
                        .set({ assignedUserId: assignedUserId || null, updatedAt: new Date() })
                        .where(eq(subgoals.id, id))
                        .returning();
                    break;
                case "plans":
                    [result] = await db.update(plans)
                        .set({ assignedUserId: assignedUserId || null, updatedAt: new Date() })
                        .where(eq(plans.id, id))
                        .returning();
                    break;
                case "programs":
                    [result] = await db.update(programs)
                        .set({ assignedUserId: assignedUserId || null, updatedAt: new Date() })
                        .where(eq(programs.id, id))
                        .returning();
                    break;
                case "projects":
                    [result] = await db.update(projects)
                        .set({ assignedUserId: assignedUserId || null, updatedAt: new Date() })
                        .where(eq(projects.id, id))
                        .returning();
                    break;
                case "instructions":
                    [result] = await db.update(instructions)
                        .set({ assignedUserId: assignedUserId || null, updatedAt: new Date() })
                        .where(eq(instructions.id, id))
                        .returning();
                    break;
                default:
                    return res.status(400).json({ error: "Invalid hierarchy type" });
            }

            if (!result) {
                return res.status(404).json({ error: "Item not found" });
            }

            res.json(result);
        } catch (error) {
            console.error("Error updating hierarchy owner:", error);
            res.status(500).json({ error: "Failed to update owner" });
        }
    });

    // Update hierarchy item title
    app.put("/api/ideal-scene/:type/:id", async (req: Request, res: Response) => {
        try {
            const { type, id } = req.params;
            const { title } = req.body;

            if (!title) {
                return res.status(400).json({ error: "Title is required" });
            }

            let result;
            switch (type) {
                case "subgoals":
                    [result] = await db.update(subgoals)
                        .set({ title, updatedAt: new Date() })
                        .where(eq(subgoals.id, id))
                        .returning();
                    break;
                case "plans":
                    [result] = await db.update(plans)
                        .set({ title, updatedAt: new Date() })
                        .where(eq(plans.id, id))
                        .returning();
                    break;
                case "programs":
                    [result] = await db.update(programs)
                        .set({ title, updatedAt: new Date() })
                        .where(eq(programs.id, id))
                        .returning();
                    break;
                case "projects":
                    [result] = await db.update(projects)
                        .set({ title, updatedAt: new Date() })
                        .where(eq(projects.id, id))
                        .returning();
                    break;
                case "instructions":
                    [result] = await db.update(instructions)
                        .set({ title, updatedAt: new Date() })
                        .where(eq(instructions.id, id))
                        .returning();
                    break;
                default:
                    return res.status(400).json({ error: "Invalid hierarchy type" });
            }

            if (!result) {
                return res.status(404).json({ error: "Item not found" });
            }

            res.json(result);
        } catch (error) {
            console.error("Error updating hierarchy item:", error);
            res.status(500).json({ error: "Failed to update item" });
        }
    });

    // Delete hierarchy item (soft delete)
    app.delete("/api/ideal-scene/:type/:id", async (req: Request, res: Response) => {
        try {
            const { type, id } = req.params;

            let result;
            switch (type) {
                case "subgoals":
                    [result] = await db.update(subgoals)
                        .set({ isActive: false, updatedAt: new Date() })
                        .where(eq(subgoals.id, id))
                        .returning();
                    break;
                case "plans":
                    [result] = await db.update(plans)
                        .set({ isActive: false, updatedAt: new Date() })
                        .where(eq(plans.id, id))
                        .returning();
                    break;
                case "programs":
                    [result] = await db.update(programs)
                        .set({ isActive: false, updatedAt: new Date() })
                        .where(eq(programs.id, id))
                        .returning();
                    break;
                case "projects":
                    [result] = await db.update(projects)
                        .set({ isActive: false, updatedAt: new Date() })
                        .where(eq(projects.id, id))
                        .returning();
                    break;
                case "instructions":
                    [result] = await db.update(instructions)
                        .set({ isActive: false, updatedAt: new Date() })
                        .where(eq(instructions.id, id))
                        .returning();
                    break;
                default:
                    return res.status(400).json({ error: "Invalid hierarchy type" });
            }

            if (!result) {
                return res.status(404).json({ error: "Item not found" });
            }

            res.json({ message: "Item deleted successfully" });
        } catch (error) {
            console.error("Error deleting hierarchy item:", error);
            res.status(500).json({ error: "Failed to delete item" });
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

            // Resolve hierarchy path and main goal for each task
            const tasksWithPath = await Promise.all(taskList.map(async (task: any) => {
                interface HierarchyItem {
                    title: string;
                    level: string;
                    dueDate?: string | null;
                    assignedUser?: { id: string; name: string } | null;
                }
                let hierarchyPath: HierarchyItem[] = [];
                let mainGoalTitle: string | null = null;

                try {
                    if (task.hierarchyLevel === "INSTRUCTION") {
                        const instruction = await db.query.instructions.findFirst({
                            where: eq(instructions.id, task.parentItemId),
                            with: {
                                assignedUser: true,
                                project: {
                                    with: {
                                        assignedUser: true,
                                        program: {
                                            with: {
                                                assignedUser: true,
                                                plan: {
                                                    with: {
                                                        assignedUser: true,
                                                        subgoal: {
                                                            with: {
                                                                assignedUser: true,
                                                                mainGoal: true,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        });
                        if (instruction) {
                            mainGoalTitle = instruction.project?.program?.plan?.subgoal?.mainGoal?.title || null;
                            const subgoal = instruction.project?.program?.plan?.subgoal;
                            const plan = instruction.project?.program?.plan;
                            const program = instruction.project?.program;
                            const project = instruction.project;
                            if (subgoal?.title) hierarchyPath.push({
                                title: subgoal.title,
                                level: "SUBGOAL",
                                dueDate: subgoal.dueDate,
                                assignedUser: subgoal.assignedUser ? { id: subgoal.assignedUser.id, name: subgoal.assignedUser.name } : null
                            });
                            if (plan?.title) hierarchyPath.push({
                                title: plan.title,
                                level: "PLAN",
                                dueDate: plan.dueDate,
                                assignedUser: plan.assignedUser ? { id: plan.assignedUser.id, name: plan.assignedUser.name } : null
                            });
                            if (program?.title) hierarchyPath.push({
                                title: program.title,
                                level: "PROGRAM",
                                dueDate: program.dueDate,
                                assignedUser: program.assignedUser ? { id: program.assignedUser.id, name: program.assignedUser.name } : null
                            });
                            if (project?.title) hierarchyPath.push({
                                title: project.title,
                                level: "PROJECT",
                                dueDate: project.dueDate,
                                assignedUser: project.assignedUser ? { id: project.assignedUser.id, name: project.assignedUser.name } : null
                            });
                            hierarchyPath.push({
                                title: instruction.title,
                                level: "INSTRUCTION",
                                dueDate: instruction.dueDate,
                                assignedUser: instruction.assignedUser ? { id: instruction.assignedUser.id, name: instruction.assignedUser.name } : null
                            });
                        }
                    } else if (task.hierarchyLevel === "PROJECT") {
                        const project = await db.query.projects.findFirst({
                            where: eq(projects.id, task.parentItemId),
                            with: {
                                assignedUser: true,
                                program: {
                                    with: {
                                        assignedUser: true,
                                        plan: {
                                            with: {
                                                assignedUser: true,
                                                subgoal: {
                                                    with: {
                                                        assignedUser: true,
                                                        mainGoal: true,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        });
                        if (project) {
                            mainGoalTitle = project.program?.plan?.subgoal?.mainGoal?.title || null;
                            const subgoal = project.program?.plan?.subgoal;
                            const plan = project.program?.plan;
                            const program = project.program;
                            if (subgoal?.title) hierarchyPath.push({
                                title: subgoal.title,
                                level: "SUBGOAL",
                                dueDate: subgoal.dueDate,
                                assignedUser: subgoal.assignedUser ? { id: subgoal.assignedUser.id, name: subgoal.assignedUser.name } : null
                            });
                            if (plan?.title) hierarchyPath.push({
                                title: plan.title,
                                level: "PLAN",
                                dueDate: plan.dueDate,
                                assignedUser: plan.assignedUser ? { id: plan.assignedUser.id, name: plan.assignedUser.name } : null
                            });
                            if (program?.title) hierarchyPath.push({
                                title: program.title,
                                level: "PROGRAM",
                                dueDate: program.dueDate,
                                assignedUser: program.assignedUser ? { id: program.assignedUser.id, name: program.assignedUser.name } : null
                            });
                            hierarchyPath.push({
                                title: project.title,
                                level: "PROJECT",
                                dueDate: project.dueDate,
                                assignedUser: project.assignedUser ? { id: project.assignedUser.id, name: project.assignedUser.name } : null
                            });
                        }
                    } else if (task.hierarchyLevel === "PROGRAM") {
                        const program = await db.query.programs.findFirst({
                            where: eq(programs.id, task.parentItemId),
                            with: {
                                assignedUser: true,
                                plan: {
                                    with: {
                                        assignedUser: true,
                                        subgoal: {
                                            with: {
                                                assignedUser: true,
                                                mainGoal: true,
                                            },
                                        },
                                    },
                                },
                            },
                        });
                        if (program) {
                            mainGoalTitle = program.plan?.subgoal?.mainGoal?.title || null;
                            const subgoal = program.plan?.subgoal;
                            const plan = program.plan;
                            if (subgoal?.title) hierarchyPath.push({
                                title: subgoal.title,
                                level: "SUBGOAL",
                                dueDate: subgoal.dueDate,
                                assignedUser: subgoal.assignedUser ? { id: subgoal.assignedUser.id, name: subgoal.assignedUser.name } : null
                            });
                            if (plan?.title) hierarchyPath.push({
                                title: plan.title,
                                level: "PLAN",
                                dueDate: plan.dueDate,
                                assignedUser: plan.assignedUser ? { id: plan.assignedUser.id, name: plan.assignedUser.name } : null
                            });
                            hierarchyPath.push({
                                title: program.title,
                                level: "PROGRAM",
                                dueDate: program.dueDate,
                                assignedUser: program.assignedUser ? { id: program.assignedUser.id, name: program.assignedUser.name } : null
                            });
                        }
                    } else if (task.hierarchyLevel === "PLAN") {
                        const plan = await db.query.plans.findFirst({
                            where: eq(plans.id, task.parentItemId),
                            with: {
                                assignedUser: true,
                                subgoal: {
                                    with: {
                                        assignedUser: true,
                                        mainGoal: true,
                                    },
                                },
                            },
                        });
                        if (plan) {
                            mainGoalTitle = plan.subgoal?.mainGoal?.title || null;
                            const subgoal = plan.subgoal;
                            if (subgoal?.title) hierarchyPath.push({
                                title: subgoal.title,
                                level: "SUBGOAL",
                                dueDate: subgoal.dueDate,
                                assignedUser: subgoal.assignedUser ? { id: subgoal.assignedUser.id, name: subgoal.assignedUser.name } : null
                            });
                            hierarchyPath.push({
                                title: plan.title,
                                level: "PLAN",
                                dueDate: plan.dueDate,
                                assignedUser: plan.assignedUser ? { id: plan.assignedUser.id, name: plan.assignedUser.name } : null
                            });
                        }
                    } else if (task.hierarchyLevel === "SUBGOAL") {
                        const subgoal = await db.query.subgoals.findFirst({
                            where: eq(subgoals.id, task.parentItemId),
                            with: {
                                assignedUser: true,
                                mainGoal: true,
                            },
                        });
                        if (subgoal) {
                            mainGoalTitle = subgoal.mainGoal?.title || null;
                            hierarchyPath.push({
                                title: subgoal.title,
                                level: "SUBGOAL",
                                dueDate: subgoal.dueDate,
                                assignedUser: subgoal.assignedUser ? { id: subgoal.assignedUser.id, name: subgoal.assignedUser.name } : null
                            });
                        }
                    }
                } catch (e) {
                    console.error("Error resolving hierarchy for task", task.id, e);
                }

                return { ...task, hierarchyPath, mainGoalTitle };
            }));

            res.json(tasksWithPath);
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

            // Auto-sync to Outlook calendar if task has due date
            if (dueDate && responsibleUserId) {
                try {
                    await syncTaskToCalendar(task.id, responsibleUserId);
                } catch (calendarError) {
                    // Don't fail the task creation if calendar sync fails
                    console.log("Calendar sync skipped:", calendarError);
                }
            }

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

    // Update user name
    app.put("/api/users/:id/name", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: "Name is required" });
            }

            const [updated] = await db.update(users)
                .set({ name, updatedAt: new Date() })
                .where(eq(users.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating user name:", error);
            res.status(500).json({ error: "Failed to update user name" });
        }
    });

    // Delete user (soft delete - sets isActive to false)
    app.delete("/api/users/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const [deleted] = await db.update(users)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(users.id, id))
                .returning();

            if (!deleted) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json({ success: true, message: "User deleted" });
        } catch (error) {
            console.error("Error deleting user:", error);
            res.status(500).json({ error: "Failed to delete user" });
        }
    });

    // Upload/update user avatar
    app.post("/api/users/:id/avatar", uploadAvatar.single('avatar'), async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            let avatarUrl: string;

            // Use Object Storage if available (Replit), otherwise use local filesystem
            if (objectStorageClient) {
                const objectName = `avatars/${id}-${Date.now()}.jpg`;
                const fileBuffer = fs.readFileSync(file.path);

                // Upload to Object Storage
                const result = await objectStorageClient.uploadFromBytes(objectName, fileBuffer);

                if (result.error) {
                    fs.unlinkSync(file.path);
                    return res.status(500).json({ error: "Failed to upload to storage" });
                }

                // Delete temp file
                fs.unlinkSync(file.path);

                // Create URL - Object Storage serves files at this path
                avatarUrl = `/objstorage/${objectName}`;
            } else {
                // Local filesystem fallback
                avatarUrl = `/uploads/avatars/${file.filename}`;
            }

            // Get old avatar URL before update
            const oldUser = await db.query.users.findFirst({
                where: eq(users.id, id),
            });

            // Update user's avatar URL in database
            const [updated] = await db.update(users)
                .set({ avatarUrl, updatedAt: new Date() })
                .where(eq(users.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "User not found" });
            }

            // Delete old avatar from Object Storage if exists
            if (oldUser?.avatarUrl && oldUser.avatarUrl.startsWith('/objstorage/') && objectStorageClient) {
                const oldObjectName = oldUser.avatarUrl.replace('/objstorage/', '');
                try { await objectStorageClient.delete(oldObjectName); } catch { }
            }

            res.json({ success: true, avatarUrl });
        } catch (error) {
            console.error("Error uploading avatar:", error);
            res.status(500).json({ error: "Failed to upload avatar" });
        }
    });

    // Delete user avatar
    app.delete("/api/users/:id/avatar", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Get current avatar URL
            const user = await db.query.users.findFirst({
                where: eq(users.id, id),
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Delete from Object Storage if exists
            if (user.avatarUrl && user.avatarUrl.startsWith('/objstorage/') && objectStorageClient) {
                const objectName = user.avatarUrl.replace('/objstorage/', '');
                try { await objectStorageClient.delete(objectName); } catch { }
            }
            // Delete local file if exists
            else if (user.avatarUrl && user.avatarUrl.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), user.avatarUrl);
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch { }
                }
            }

            // Update user to remove avatar URL
            await db.update(users)
                .set({ avatarUrl: null, updatedAt: new Date() })
                .where(eq(users.id, id));

            res.json({ success: true });
        } catch (error) {
            console.error("Error deleting avatar:", error);
            res.status(500).json({ error: "Failed to delete avatar" });
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

                // Count hierarchy items assigned to this user
                const [subgoalCount] = await db.select({ count: sql<number>`count(*)` })
                    .from(subgoals)
                    .where(and(eq(subgoals.assignedUserId, user.id), eq(subgoals.isActive, true)));
                const [planCount] = await db.select({ count: sql<number>`count(*)` })
                    .from(plans)
                    .where(and(eq(plans.assignedUserId, user.id), eq(plans.isActive, true)));
                const [programCount] = await db.select({ count: sql<number>`count(*)` })
                    .from(programs)
                    .where(and(eq(programs.assignedUserId, user.id), eq(programs.isActive, true)));
                const [projectCount] = await db.select({ count: sql<number>`count(*)` })
                    .from(projects)
                    .where(and(eq(projects.assignedUserId, user.id), eq(projects.isActive, true)));
                const [instructionCount] = await db.select({ count: sql<number>`count(*)` })
                    .from(instructions)
                    .where(and(eq(instructions.assignedUserId, user.id), eq(instructions.isActive, true)));

                const hierarchyCount = Number(subgoalCount.count || 0) +
                    Number(planCount.count || 0) +
                    Number(programCount.count || 0) +
                    Number(projectCount.count || 0) +
                    Number(instructionCount.count || 0);

                const todoCount = userTasks.filter(t => t.status === "TODO").length + hierarchyCount;
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
                    userAvatarUrl: user.avatarUrl,
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

    // ============================================================================
    // INVITATIONS (Team member email invitations)
    // ============================================================================

    // Get all invitations (CEO/EXECUTIVE only)
    app.get("/api/invitations", async (req: Request, res: Response) => {
        try {
            const invitationList = await db.query.invitations.findMany({
                with: {
                    invitedBy: true,
                },
                orderBy: [desc(invitations.createdAt)],
            });
            res.json(invitationList);
        } catch (error) {
            console.error("Error fetching invitations:", error);
            res.status(500).json({ error: "Failed to fetch invitations" });
        }
    });

    // Create invitation (CEO/EXECUTIVE only)
    app.post("/api/invitations", async (req: Request, res: Response) => {
        try {
            const { email, role, name } = req.body;
            const invitedById = req.session?.userId;

            if (!email) {
                return res.status(400).json({ error: "Email is required" });
            }

            // Check if user already exists (and is not pending)
            const existingUser = await db.query.users.findFirst({
                where: and(eq(users.email, email), eq(users.isPending, false)),
            });

            if (existingUser) {
                return res.status(400).json({ error: "User with this email already exists" });
            }

            // Check if invitation already exists and is pending
            const existingInvitation = await db.query.invitations.findFirst({
                where: and(
                    eq(invitations.email, email),
                    isNull(invitations.acceptedAt)
                ),
            });

            if (existingInvitation) {
                return res.status(400).json({ error: "Invitation already sent to this email" });
            }

            // Check if there's a pending user already (from a previous expired invitation)
            let pendingUser = await db.query.users.findFirst({
                where: and(eq(users.email, email), eq(users.isPending, true)),
            });

            // Create pending user if not exists
            if (!pendingUser) {
                const [newPendingUser] = await db.insert(users).values({
                    email,
                    name: name || email.split("@")[0], // Use name if provided, otherwise email prefix
                    role: role || "USER",
                    isPending: true,
                }).returning();
                pendingUser = newPendingUser;
            }

            // Generate unique token
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            const [invitation] = await db.insert(invitations).values({
                email,
                role: role || "USER",
                token,
                invitedById,
                expiresAt,
            }).returning();

            // TODO: Send email with invitation link
            // For now, return the token for manual sharing
            res.json({
                ...invitation,
                pendingUserId: pendingUser.id,
                inviteUrl: `/invite/${token}`,
                message: "Invitation created and pending user added. They can now be assigned to departments and tasks.",
            });
        } catch (error) {
            console.error("Error creating invitation:", error);
            res.status(500).json({ error: "Failed to create invitation" });
        }
    });

    // Validate invitation token
    app.get("/api/invitations/validate/:token", async (req: Request, res: Response) => {
        try {
            const { token } = req.params;

            const invitation = await db.query.invitations.findFirst({
                where: eq(invitations.token, token),
                with: {
                    invitedBy: true,
                },
            });

            if (!invitation) {
                return res.status(404).json({ error: "Invitation not found" });
            }

            if (invitation.acceptedAt) {
                return res.status(400).json({ error: "Invitation already accepted" });
            }

            if (new Date(invitation.expiresAt) < new Date()) {
                return res.status(400).json({ error: "Invitation expired" });
            }

            res.json({
                email: invitation.email,
                role: invitation.role,
                invitedBy: invitation.invitedBy?.name || "Unknown",
                valid: true,
            });
        } catch (error) {
            console.error("Error validating invitation:", error);
            res.status(500).json({ error: "Failed to validate invitation" });
        }
    });

    // Accept invitation (activates pending user account)
    app.post("/api/invitations/accept/:token", async (req: Request, res: Response) => {
        try {
            const { token } = req.params;
            const { name } = req.body;

            const invitation = await db.query.invitations.findFirst({
                where: eq(invitations.token, token),
            });

            if (!invitation) {
                return res.status(404).json({ error: "Invitation not found" });
            }

            if (invitation.acceptedAt) {
                return res.status(400).json({ error: "Invitation already accepted" });
            }

            if (new Date(invitation.expiresAt) < new Date()) {
                return res.status(400).json({ error: "Invitation expired" });
            }

            // Find the pending user that was created when invitation was sent
            let user = await db.query.users.findFirst({
                where: eq(users.email, invitation.email),
            });

            if (user) {
                // Update existing pending user to active
                const [updatedUser] = await db.update(users)
                    .set({
                        name: name || user.name,
                        isPending: false,
                        role: invitation.role, // Ensure role matches invitation
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, user.id))
                    .returning();
                user = updatedUser;
            } else {
                // Fallback: Create user if not found (shouldn't happen normally)
                const [newUser] = await db.insert(users).values({
                    email: invitation.email,
                    name: name || invitation.email.split("@")[0],
                    role: invitation.role,
                    isPending: false,
                }).returning();
                user = newUser;
            }

            // Mark invitation as accepted
            await db.update(invitations)
                .set({ acceptedAt: new Date() })
                .where(eq(invitations.id, invitation.id));

            // Set session
            req.session.userId = user.id;
            req.session.userRole = user.role;

            res.json({
                message: "Invitation accepted! You are now logged in.",
                user: user,
            });
        } catch (error) {
            console.error("Error accepting invitation:", error);
            res.status(500).json({ error: "Failed to accept invitation" });
        }
    });

    // Delete invitation
    app.delete("/api/invitations/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            await db.delete(invitations).where(eq(invitations.id, id));
            res.json({ success: true });
        } catch (error) {
            console.error("Error deleting invitation:", error);
            res.status(500).json({ error: "Failed to delete invitation" });
        }
    });

    // Health check
    app.get("/api/health", (req: Request, res: Response) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // ============================================================================
    // POLICIES (Irányelvek / Directive de Funcționare)
    // ============================================================================

    // Get all policies (with optional scope filter)
    app.get("/api/policies", async (req: Request, res: Response) => {
        try {
            const { scope } = req.query;

            const policyList = await db.query.policies.findMany({
                where: scope
                    ? and(eq(policies.scope, scope as any), eq(policies.isActive, true))
                    : eq(policies.isActive, true),
                with: {
                    createdBy: true,
                    policyPosts: {
                        with: {
                            post: {
                                with: {
                                    department: true,
                                    user: true,
                                },
                            },
                        },
                    },
                    policyDepartments: {
                        with: {
                            department: true,
                        },
                    },
                },
                orderBy: [desc(policies.createdAt)],
            });

            res.json(policyList);
        } catch (error) {
            console.error("Error fetching policies:", error);
            res.status(500).json({ error: "Failed to fetch policies" });
        }
    });

    // Get single policy by ID
    app.get("/api/policies/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const policy = await db.query.policies.findFirst({
                where: eq(policies.id, id),
                with: {
                    createdBy: true,
                    policyPosts: {
                        with: {
                            post: {
                                with: {
                                    department: true,
                                    user: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!policy) {
                return res.status(404).json({ error: "Policy not found" });
            }

            res.json(policy);
        } catch (error) {
            console.error("Error fetching policy:", error);
            res.status(500).json({ error: "Failed to fetch policy" });
        }
    });

    // Create policy (CEO only)
    app.post("/api/policies", async (req: Request, res: Response) => {
        try {
            console.log("Policy creation request body:", JSON.stringify(req.body));
            const { title, content, scope, createdById, postIds, departmentIds } = req.body;

            if (!title) {
                return res.status(400).json({ error: "Title is required" });
            }
            if (!content) {
                return res.status(400).json({ error: "Content is required" });
            }
            if (!createdById) {
                return res.status(400).json({ error: "CreatedById is required - are you logged in?" });
            }

            // Create the policy
            const [policy] = await db.insert(policies).values({
                title,
                content,
                scope: scope || "POST",
                createdById,
            }).returning();

            // If postIds provided (for POST scope), create policy-post associations
            if (postIds && Array.isArray(postIds) && postIds.length > 0) {
                const policyPostValues = postIds.map((postId: string) => ({
                    policyId: policy.id,
                    postId,
                }));
                await db.insert(policyPosts).values(policyPostValues);
            }

            // If departmentIds provided (for DEPARTMENT scope), create policy-department associations
            if (departmentIds && Array.isArray(departmentIds) && departmentIds.length > 0) {
                const policyDeptValues = departmentIds.map((departmentId: string) => ({
                    policyId: policy.id,
                    departmentId,
                }));
                await db.insert(policyDepartments).values(policyDeptValues);
            }

            // Fetch the complete policy with relations
            const completePolicy = await db.query.policies.findFirst({
                where: eq(policies.id, policy.id),
                with: {
                    createdBy: true,
                    policyPosts: {
                        with: {
                            post: true,
                        },
                    },
                    policyDepartments: {
                        with: {
                            department: true,
                        },
                    },
                },
            });

            res.status(201).json(completePolicy);
        } catch (error) {
            console.error("Error creating policy:", error);
            res.status(500).json({ error: "Failed to create policy" });
        }
    });

    // Update policy (CEO only)
    app.put("/api/policies/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { title, content, scope } = req.body;

            const [updated] = await db
                .update(policies)
                .set({
                    title,
                    content,
                    scope,
                    updatedAt: new Date(),
                })
                .where(eq(policies.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Policy not found" });
            }

            res.json(updated);
        } catch (error) {
            console.error("Error updating policy:", error);
            res.status(500).json({ error: "Failed to update policy" });
        }
    });

    // Soft delete policy (CEO only)
    app.delete("/api/policies/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const [updated] = await db
                .update(policies)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(policies.id, id))
                .returning();

            if (!updated) {
                return res.status(404).json({ error: "Policy not found" });
            }

            res.json({ success: true, message: "Policy archived" });
        } catch (error) {
            console.error("Error deleting policy:", error);
            res.status(500).json({ error: "Failed to delete policy" });
        }
    });

    // Get policies for a specific post
    app.get("/api/posts/:id/policies", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Get post-specific policies
            const postPolicies = await db.query.policyPosts.findMany({
                where: eq(policyPosts.postId, id),
                with: {
                    policy: {
                        with: {
                            createdBy: true,
                        },
                    },
                },
            });

            // Get company-wide policies
            const companyPolicies = await db.query.policies.findMany({
                where: and(eq(policies.scope, "COMPANY"), eq(policies.isActive, true)),
                with: {
                    createdBy: true,
                },
            });

            // Combine and return
            const allPolicies = {
                postPolicies: postPolicies
                    .filter(pp => pp.policy.isActive)
                    .map(pp => pp.policy),
                companyPolicies,
            };

            res.json(allPolicies);
        } catch (error) {
            console.error("Error fetching post policies:", error);
            res.status(500).json({ error: "Failed to fetch post policies" });
        }
    });

    // Assign posts to a policy (CEO only)
    app.post("/api/policies/:id/posts", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { postIds } = req.body;

            if (!postIds || !Array.isArray(postIds)) {
                return res.status(400).json({ error: "postIds array is required" });
            }

            // Delete existing associations
            await db.delete(policyPosts).where(eq(policyPosts.policyId, id));

            // Create new associations
            if (postIds.length > 0) {
                const policyPostValues = postIds.map((postId: string) => ({
                    policyId: id,
                    postId,
                }));
                await db.insert(policyPosts).values(policyPostValues);
            }

            res.json({ success: true, message: "Posts assigned to policy" });
        } catch (error) {
            console.error("Error assigning posts to policy:", error);
            res.status(500).json({ error: "Failed to assign posts to policy" });
        }
    });

    // Remove a post from a policy (CEO only)
    app.delete("/api/policies/:policyId/posts/:postId", async (req: Request, res: Response) => {
        try {
            const { policyId, postId } = req.params;

            await db.delete(policyPosts).where(
                and(
                    eq(policyPosts.policyId, policyId),
                    eq(policyPosts.postId, postId)
                )
            );

            res.json({ success: true, message: "Post removed from policy" });
        } catch (error) {
            console.error("Error removing post from policy:", error);
            res.status(500).json({ error: "Failed to remove post from policy" });
        }
    });

    // ============================================================================
    // CALENDAR SYNC ENDPOINTS
    // ============================================================================

    // Check if calendar is connected for current user
    app.get("/api/calendar/status", async (req: Request, res: Response) => {
        const userId = (req.session as any)?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const connected = await hasCalendarConnected(userId);
        res.json({ connected });
    });

    // Sync a single task to calendar
    app.post("/api/calendar/sync-task/:taskId", async (req: Request, res: Response) => {
        const userId = (req.session as any)?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const { taskId } = req.params;
        const result = await syncTaskToCalendar(taskId, userId);

        if (result.success) {
            res.json({ success: true, eventId: result.eventId });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    });

    // Sync all user's tasks to calendar
    app.post("/api/calendar/sync-all", async (req: Request, res: Response) => {
        const userId = (req.session as any)?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const result = await syncAllTasksToCalendar(userId);
        res.json({
            success: true,
            synced: result.synced,
            failed: result.failed,
            message: `${result.synced} sarcini sincronizate cu calendarul Outlook.`
        });
    });
}
