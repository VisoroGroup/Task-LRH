import { db } from "../db";
import { eq, and, gte, lt, isNull, not } from "drizzle-orm";
import { users, posts, tasks } from "../../shared/schema";
import { Resend } from "resend";

// Lazy initialization for Resend
let resend: Resend | null = null;

function getResendClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
        return null;
    }
    if (!resend) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
}

interface UserStats {
    userId: string;
    userName: string;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
}

interface WeeklyReportData {
    weekStart: Date;
    weekEnd: Date;
    userStats: UserStats[];
    totalCompleted: number;
    totalOpen: number;
    totalOverdue: number;
}

/**
 * Get weekly task statistics for all users
 */
async function getWeeklyStats(): Promise<WeeklyReportData> {
    const now = new Date();

    // Get start and end of last week (Monday to Sunday)
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - now.getDay()); // Go to Sunday
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6); // Go back to Monday
    weekStart.setHours(0, 0, 0, 0);

    // Get all users
    const allUsers = await db.query.users.findMany({
        columns: { id: true, name: true },
    });

    // Get all posts with their users
    const allPosts = await db.query.posts.findMany({
        where: (posts, { isNotNull }) => isNotNull(posts.userId),
    });

    // Build user to posts mapping
    const userPostIds = new Map<string, string[]>();
    for (const post of allPosts) {
        if (post.userId) {
            const existing = userPostIds.get(post.userId) || [];
            existing.push(post.id);
            userPostIds.set(post.userId, existing);
        }
    }

    // Get all tasks
    const allTasks = await db.query.tasks.findMany({
        columns: {
            id: true,
            status: true,
            dueDate: true,
            completedAt: true,
            responsiblePostId: true,
        },
    });

    const userStats: UserStats[] = [];
    let totalCompleted = 0;
    let totalOpen = 0;
    let totalOverdue = 0;

    for (const user of allUsers) {
        const postIds = userPostIds.get(user.id) || [];

        if (postIds.length === 0) {
            continue; // Skip users without posts
        }

        // Filter tasks for this user's posts
        const userTasks = allTasks.filter(t =>
            t.responsiblePostId && postIds.includes(t.responsiblePostId)
        );

        // Count completed tasks (completed during this week)
        const completedTasks = userTasks.filter(t => {
            if (t.status !== "DONE" || !t.completedAt) return false;
            const completedAt = new Date(t.completedAt);
            return completedAt >= weekStart && completedAt <= weekEnd;
        }).length;

        // Count open tasks (not completed)
        const openTasks = userTasks.filter(t =>
            t.status !== "DONE"
        ).length;

        // Count overdue tasks (due date passed, not completed)
        const overdueTasks = userTasks.filter(t => {
            if (t.status === "DONE" || !t.dueDate) return false;
            return new Date(t.dueDate) < now;
        }).length;

        if (completedTasks > 0 || openTasks > 0 || overdueTasks > 0) {
            userStats.push({
                userId: user.id,
                userName: user.name,
                completedTasks,
                openTasks,
                overdueTasks,
            });

            totalCompleted += completedTasks;
            totalOpen += openTasks;
            totalOverdue += overdueTasks;
        }
    }

    // Sort by completed tasks (descending)
    userStats.sort((a, b) => b.completedTasks - a.completedTasks);

    return {
        weekStart,
        weekEnd,
        userStats,
        totalCompleted,
        totalOpen,
        totalOverdue,
    };
}

/**
 * Send weekly report email to CEO
 */
export async function sendWeeklyReportEmail(): Promise<boolean> {
    const client = getResendClient();

    if (!client) {
        console.warn("RESEND_API_KEY not configured, skipping weekly report");
        return false;
    }

    const ceoEmail = process.env.CEO_EMAIL || "ledenyi.robert@visoro-global.ro";

    console.log("Generating weekly report...");
    const data = await getWeeklyStats();

    const weekStartStr = data.weekStart.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
    });
    const weekEndStr = data.weekEnd.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // Generate user rows
    const userRows = data.userStats.map((user, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
        const overdueColor = user.overdueTasks > 0 ? "#ef4444" : "#22c55e";

        return `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 16px; font-weight: 500;">
                    ${medal} ${user.userName}
                </td>
                <td style="padding: 12px 16px; text-align: center; color: #22c55e; font-weight: 600;">
                    ${user.completedTasks}
                </td>
                <td style="padding: 12px 16px; text-align: center; color: #6b7280;">
                    ${user.openTasks}
                </td>
                <td style="padding: 12px 16px; text-align: center; color: ${overdueColor}; font-weight: 600;">
                    ${user.overdueTasks}
                </td>
            </tr>
        `;
    }).join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px;">
    <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📊 Raport Săptămânal</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                ${weekStartStr} - ${weekEndStr}
            </p>
        </div>
        
        <!-- Summary Cards -->
        <div style="padding: 24px 32px;">
            <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="flex: 1; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #16a34a;">${data.totalCompleted}</div>
                    <div style="font-size: 12px; color: #166534; font-weight: 500;">Finalizate</div>
                </div>
                <div style="flex: 1; background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #4f46e5;">${data.totalOpen}</div>
                    <div style="font-size: 12px; color: #3730a3; font-weight: 500;">Deschise</div>
                </div>
                <div style="flex: 1; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700; color: #dc2626;">${data.totalOverdue}</div>
                    <div style="font-size: 12px; color: #991b1b; font-weight: 500;">Întârziate</div>
                </div>
            </div>
        </div>
        
        <!-- User Table -->
        <div style="padding: 0 32px 24px 32px;">
            <h3 style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
                👥 Performanță per utilizator
            </h3>
            <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; overflow: hidden;">
                <thead>
                    <tr style="background: #374151; color: white;">
                        <th style="padding: 12px 16px; text-align: left; font-weight: 600;">Utilizator</th>
                        <th style="padding: 12px 16px; text-align: center; font-weight: 600;">✅ Finalizate</th>
                        <th style="padding: 12px 16px; text-align: center; font-weight: 600;">📂 Deschise</th>
                        <th style="padding: 12px 16px; text-align: center; font-weight: 600;">⏰ Întârziate</th>
                    </tr>
                </thead>
                <tbody>
                    ${userRows || '<tr><td colspan="4" style="padding: 24px; text-align: center; color: #6b7280;">Nu există date pentru această perioadă</td></tr>'}
                </tbody>
            </table>
        </div>
        
        <!-- CTA Button -->
        <div style="padding: 0 32px 32px 32px; text-align: center;">
            <a href="${process.env.APP_URL || "https://task-lrh-production.up.railway.app"}" 
               style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Vezi detalii în aplicație →
            </a>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Acest raport a fost generat automat de Task Manager.
                <br>O săptămână productivă! 🚀
            </p>
        </div>
    </div>
</body>
</html>
    `;

    try {
        const { error } = await client.emails.send({
            from: "Task Manager <onboarding@resend.dev>",
            to: ceoEmail,
            subject: `📊 Raport Săptămânal: ${weekStartStr} - ${weekEndStr}`,
            html,
        });

        if (error) {
            console.error("Failed to send weekly report:", error);
            return false;
        }

        console.log(`Weekly report sent to ${ceoEmail}`);
        return true;
    } catch (error) {
        console.error("Failed to send weekly report:", error);
        return false;
    }
}
