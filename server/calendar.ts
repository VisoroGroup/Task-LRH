import { db } from "./db";
import { users, tasks } from "../shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";

// Microsoft Graph API base URL
const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";

// Refresh access token if expired
async function refreshAccessToken(userId: string): Promise<string | null> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user?.microsoftRefreshToken) {
        return null;
    }

    // Check if token is still valid (with 5 min buffer)
    if (user.microsoftTokenExpiry && user.microsoftTokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
        return user.microsoftAccessToken;
    }

    // Token expired, refresh it
    try {
        const tokenResponse = await fetch(
            `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: MICROSOFT_CLIENT_ID!,
                    client_secret: MICROSOFT_CLIENT_SECRET!,
                    refresh_token: user.microsoftRefreshToken,
                    grant_type: "refresh_token",
                }),
            }
        );

        if (!tokenResponse.ok) {
            console.error("Failed to refresh token:", await tokenResponse.text());
            return null;
        }

        const tokens = await tokenResponse.json();

        // Update user with new tokens
        await db.update(users)
            .set({
                microsoftAccessToken: tokens.access_token,
                microsoftRefreshToken: tokens.refresh_token || user.microsoftRefreshToken,
                microsoftTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return tokens.access_token;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
}

// Create or update calendar event for a task
export async function syncTaskToCalendar(taskId: string, userId: string): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const accessToken = await refreshAccessToken(userId);
    if (!accessToken) {
        return { success: false, error: "Nu ești conectat la Microsoft. Te rugăm să te reconectezi." };
    }

    // Get task details
    const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
        with: {
            department: true,
            responsibleUser: true,
        },
    });

    if (!task || !task.dueDate) {
        return { success: false, error: "Task-ul nu are dată limită setată." };
    }

    // Create event object
    const dueDate = new Date(task.dueDate);
    const event = {
        subject: `📋 Task: ${task.title}`,
        body: {
            contentType: "HTML",
            content: `<p><strong>Task din LRH Flow System</strong></p>
                <p><strong>Departament:</strong> ${task.department?.name || "N/A"}</p>
                <p><strong>Status:</strong> ${task.status}</p>
                <p><a href="${process.env.APP_URL || "https://task-lrh.replit.app"}/my-tasks">Deschide în aplicație</a></p>`,
        },
        start: {
            dateTime: dueDate.toISOString(),
            timeZone: "Europe/Bucharest",
        },
        end: {
            dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
            timeZone: "Europe/Bucharest",
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 60, // 1 hour reminder
        categories: ["LRH Task"],
    };

    try {
        // Check if task already has a calendar event ID (for updates)
        const existingEventId = (task as any).calendarEventId;

        let response;
        if (existingEventId) {
            // Update existing event
            response = await fetch(`${GRAPH_API_BASE}/me/calendar/events/${existingEventId}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });
        } else {
            // Create new event
            response = await fetch(`${GRAPH_API_BASE}/me/calendar/events`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Calendar API error:", errorText);
            return { success: false, error: "Nu s-a putut sincroniza cu calendarul." };
        }

        const createdEvent = await response.json();
        return { success: true, eventId: createdEvent.id };
    } catch (error) {
        console.error("Error syncing to calendar:", error);
        return { success: false, error: "Eroare la sincronizarea cu calendarul." };
    }
}

// Delete calendar event when task is deleted or completed
export async function deleteCalendarEvent(eventId: string, userId: string): Promise<boolean> {
    const accessToken = await refreshAccessToken(userId);
    if (!accessToken) return false;

    try {
        const response = await fetch(`${GRAPH_API_BASE}/me/calendar/events/${eventId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        return response.ok || response.status === 404; // 404 means already deleted
    } catch (error) {
        console.error("Error deleting calendar event:", error);
        return false;
    }
}

// Sync all pending tasks for a user to their calendar
export async function syncAllTasksToCalendar(userId: string): Promise<{ synced: number; failed: number }> {
    const userTasks = await db.query.tasks.findMany({
        where: and(
            eq(tasks.responsibleUserId, userId),
            isNotNull(tasks.dueDate)
        ),
    });

    let synced = 0;
    let failed = 0;

    for (const task of userTasks) {
        if (task.status !== "DONE") {
            const result = await syncTaskToCalendar(task.id, userId);
            if (result.success) {
                synced++;
            } else {
                failed++;
            }
        }
    }

    return { synced, failed };
}

// Check if user has calendar connected
export async function hasCalendarConnected(userId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    return !!(user?.microsoftAccessToken && user?.microsoftRefreshToken);
}
