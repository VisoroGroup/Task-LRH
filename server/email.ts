import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Microsoft Graph API email sending service

interface EmailOptions {
    to: string;
    subject: string;
    body: string;
    isHtml?: boolean;
}

/**
 * Refresh Microsoft access token if expired
 */
async function refreshTokenIfNeeded(user: any): Promise<string | null> {
    if (!user.microsoftRefreshToken) {
        console.log(`User ${user.email} has no refresh token`);
        return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiry = user.microsoftTokenExpiry ? new Date(user.microsoftTokenExpiry) : new Date(0);
    const bufferMs = 5 * 60 * 1000; // 5 minutes

    if (expiry.getTime() - bufferMs > now.getTime()) {
        // Token is still valid
        return user.microsoftAccessToken;
    }

    console.log(`Refreshing token for ${user.email}...`);

    try {
        const response = await fetch(
            `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: process.env.MICROSOFT_CLIENT_ID!,
                    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
                    refresh_token: user.microsoftRefreshToken,
                    grant_type: "refresh_token",
                    scope: "openid profile email User.Read Mail.Send offline_access",
                }),
            }
        );

        if (!response.ok) {
            console.error("Failed to refresh token:", await response.text());
            return null;
        }

        const tokens = await response.json();

        // Update tokens in database
        await db.update(users)
            .set({
                microsoftAccessToken: tokens.access_token,
                microsoftRefreshToken: tokens.refresh_token || user.microsoftRefreshToken,
                microsoftTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));

        return tokens.access_token;
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
}

/**
 * Send email using Microsoft Graph API
 * Sends as the specified user (using their access token)
 */
export async function sendEmail(senderUserId: string, options: EmailOptions): Promise<boolean> {
    try {
        // Get sender user with tokens
        const sender = await db.query.users.findFirst({
            where: eq(users.id, senderUserId),
        });

        if (!sender) {
            console.error(`Sender user not found: ${senderUserId}`);
            return false;
        }

        // Get valid access token
        const accessToken = await refreshTokenIfNeeded(sender);
        if (!accessToken) {
            console.error(`No valid access token for ${sender.email}`);
            return false;
        }

        // Send email via Microsoft Graph
        const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: {
                    subject: options.subject,
                    body: {
                        contentType: options.isHtml ? "HTML" : "Text",
                        content: options.body,
                    },
                    toRecipients: [
                        {
                            emailAddress: {
                                address: options.to,
                            },
                        },
                    ],
                },
                saveToSentItems: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to send email: ${response.status} - ${errorText}`);
            return false;
        }

        console.log(`✅ Email sent to ${options.to}: ${options.subject}`);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

/**
 * Send notification email when a recurring task is completed
 */
export async function sendRecurringTaskCompletedEmail(
    completedByUserId: string,
    taskTitle: string,
    departmentHeadEmail: string
): Promise<boolean> {
    const completedBy = await db.query.users.findFirst({
        where: eq(users.id, completedByUserId),
    });

    if (!completedBy) return false;

    // Find a CEO user to send the email (system emails sent as CEO)
    const ceoUser = await db.query.users.findFirst({
        where: eq(users.role, "CEO"),
    });

    if (!ceoUser) {
        console.error("No CEO user found to send system emails");
        return false;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return sendEmail(ceoUser.id, {
        to: departmentHeadEmail,
        subject: `✅ ${completedBy.name} a finalizat: ${taskTitle}`,
        body: `
Bună ziua,

${completedBy.name} a finalizat cu succes următoarea sarcină recurentă:

📋 Sarcină: ${taskTitle}
👤 Finalizat de: ${completedBy.name}
📅 Data: ${dateStr}

---
Acest email a fost trimis automat de sistemul LRH Flow.
        `.trim(),
    });
}

/**
 * Send overdue notification email
 */
export async function sendRecurringTaskOverdueEmail(
    assignedUserId: string,
    supervisorId: string | null,
    taskTitle: string,
    dueDate: Date
): Promise<boolean> {
    const assignedUser = await db.query.users.findFirst({
        where: eq(users.id, assignedUserId),
    });

    if (!assignedUser) return false;

    // Find CEO to send emails
    const ceoUser = await db.query.users.findFirst({
        where: eq(users.role, "CEO"),
    });

    if (!ceoUser) return false;

    const dateStr = dueDate.toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Send to assigned user
    await sendEmail(ceoUser.id, {
        to: assignedUser.email,
        subject: `⚠️ Sarcină restantă: ${taskTitle}`,
        body: `
Bună ziua ${assignedUser.name},

Următoarea sarcină recurentă nu a fost finalizată la timp:

📋 Sarcină: ${taskTitle}
📅 Termen: ${dateStr}

Te rugăm să finalizezi această sarcină cât mai curând posibil.

---
Acest email a fost trimis automat de sistemul LRH Flow.
        `.trim(),
    });

    // Send to supervisor if exists
    if (supervisorId) {
        const supervisor = await db.query.users.findFirst({
            where: eq(users.id, supervisorId),
        });

        if (supervisor) {
            await sendEmail(ceoUser.id, {
                to: supervisor.email,
                subject: `⚠️ Subordonat cu sarcină restantă: ${taskTitle}`,
                body: `
Bună ziua ${supervisor.name},

${assignedUser.name} nu a finalizat următoarea sarcină recurentă:

📋 Sarcină: ${taskTitle}
👤 Responsabil: ${assignedUser.name}
📅 Termen: ${dateStr}

---
Acest email a fost trimis automat de sistemul LRH Flow.
                `.trim(),
            });
        }
    }

    return true;
}
