import { db } from "../db";
import { eq, and, gte, lt } from "drizzle-orm";
import { users, posts, tasks } from "../../shared/schema";
import { sendDailyTasksEmail, DailyTaskEmail } from "../services/emailService";

interface UserWithPosts {
    id: string;
    name: string;
    email: string;
    posts: {
        id: string;
        name: string;
        departmentName: string;
    }[];
}

/**
 * Get all users with their assigned posts
 */
async function getUsersWithPosts(): Promise<UserWithPosts[]> {
    const allUsers = await db.query.users.findMany({
        columns: { id: true, name: true, email: true },
    });

    const allPosts = await db.query.posts.findMany({
        where: (posts, { isNotNull }) => isNotNull(posts.userId),
        with: {
            department: { columns: { name: true } },
        },
    });

    const result: UserWithPosts[] = [];

    for (const user of allUsers) {
        const userPosts = allPosts
            .filter((p) => p.userId === user.id)
            .map((p) => ({
                id: p.id,
                name: p.name,
                departmentName: p.department?.name || "Unknown",
            }));

        if (userPosts.length > 0) {
            result.push({
                id: user.id,
                name: user.name,
                email: user.email,
                posts: userPosts,
            });
        }
    }

    return result;
}

/**
 * Get tasks for a specific date that are assigned to specific posts
 */
async function getTasksForDate(
    postIds: string[],
    date: Date
): Promise<
    {
        title: string;
        postName: string;
        departmentName: string;
        dueTime: string | null;
    }[]
> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dayTasks = await db.query.tasks.findMany({
        where: and(
            gte(tasks.dueDate, startOfDay),
            lt(tasks.dueDate, endOfDay)
        ),
        with: {
            responsiblePost: {
                with: {
                    department: { columns: { name: true } },
                },
            },
        },
    });

    return dayTasks
        .filter((t) => t.responsiblePostId && postIds.includes(t.responsiblePostId))
        .map((t) => ({
            title: t.title,
            postName: t.responsiblePost?.name || "Unknown",
            departmentName: t.responsiblePost?.department?.name || "Unknown",
            dueTime: t.dueDate
                ? new Date(t.dueDate).toLocaleTimeString("ro-RO", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
                : null,
        }));
}

/**
 * Send daily task emails to all users
 */
export async function sendDailyTasksToAllUsers(): Promise<{
    sent: number;
    failed: number;
    skipped: number;
}> {
    console.log("Starting daily task email job...");

    const today = new Date();
    const usersWithPosts = await getUsersWithPosts();

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const user of usersWithPosts) {
        const postIds = user.posts.map((p) => p.id);
        const userTasks = await getTasksForDate(postIds, today);

        if (userTasks.length === 0) {
            console.log(`No tasks for ${user.name}, skipping`);
            skipped++;
            continue;
        }

        const emailData: DailyTaskEmail = {
            recipientEmail: user.email,
            recipientName: user.name,
            tasks: userTasks,
            date: today,
        };

        const success = await sendDailyTasksEmail(emailData);
        if (success) {
            sent++;
        } else {
            failed++;
        }
    }

    console.log(
        `Daily task email job completed: ${sent} sent, ${failed} failed, ${skipped} skipped`
    );

    return { sent, failed, skipped };
}
