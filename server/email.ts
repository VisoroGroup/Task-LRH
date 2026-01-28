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

/**
 * Send hierarchy item completion email to all users in the chain
 * Beautiful HTML email showing the hierarchy path and who completed what
 */
export interface HierarchyChainItem {
    level: "mainGoal" | "subgoal" | "plan" | "program" | "project" | "instruction";
    levelLabel: string;
    title: string;
    assignedUserName?: string | null;
    assignedUserEmail?: string | null;
    isCompleted: boolean;
    isCompletedItem?: boolean; // The item that was just completed
}

export async function sendHierarchyCompletionEmail(
    completedByUser: { id: string; name: string; email: string },
    completedItem: { title: string; level: string },
    hierarchyChain: HierarchyChainItem[],
    recipientEmails: string[]
): Promise<boolean> {
    // Find CEO to send emails
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

    const levelColors: Record<string, { bg: string; border: string; text: string }> = {
        mainGoal: { bg: "#7c3aed", border: "#8b5cf6", text: "#ffffff" },
        subgoal: { bg: "rgba(139, 92, 246, 0.15)", border: "#8b5cf6", text: "#a78bfa" },
        plan: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", text: "#60a5fa" },
        program: { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", text: "#34d399" },
        project: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#fbbf24" },
        instruction: { bg: "rgba(244, 63, 94, 0.15)", border: "#f43f5e", text: "#fb7185" },
    };

    // Build hierarchy HTML
    const hierarchyHtml = hierarchyChain.map((item, index) => {
        const colors = levelColors[item.level] || levelColors.subgoal;
        const isCompletedItem = item.isCompletedItem;

        return `
            <div style="display: flex; align-items: flex-start; margin-left: ${index * 20}px; margin-bottom: 8px;">
                ${index > 0 ? `
                    <div style="width: 20px; border-left: 2px dashed #374151; height: 40px; margin-right: 10px; margin-top: -20px;"></div>
                ` : ''}
                <div style="
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 2px solid ${isCompletedItem ? '#22c55e' : colors.border};
                    background: ${isCompletedItem ? 'rgba(34, 197, 94, 0.15)' : colors.bg};
                    ${isCompletedItem ? 'box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);' : ''}
                ">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${item.isCompleted ? '✅' : '⬜'}
                        <span style="font-size: 12px; color: ${isCompletedItem ? '#22c55e' : colors.text}; font-weight: 600; text-transform: uppercase;">
                            ${item.levelLabel}
                        </span>
                        ${isCompletedItem ? '<span style="background: #22c55e; color: white; font-size: 10px; padding: 2px 8px; border-radius: 999px; margin-left: 8px;">FINALIZAT ACUM</span>' : ''}
                    </div>
                    <div style="font-weight: 600; color: ${item.level === 'mainGoal' ? '#ffffff' : '#f3f4f6'}; margin-top: 4px;">
                        ${item.title}
                    </div>
                    ${item.assignedUserName ? `
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
                            <div style="
                                width: 24px; 
                                height: 24px; 
                                border-radius: 50%; 
                                background: linear-gradient(135deg, #8b5cf6, #ec4899);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 12px;
                                color: white;
                                font-weight: 700;
                            ">${item.assignedUserName.charAt(0)}</div>
                            <span style="color: #9ca3af; font-size: 13px;">${item.assignedUserName}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td>
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="
                        display: inline-block;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        border-radius: 999px;
                        color: white;
                        font-size: 14px;
                        font-weight: 700;
                        letter-spacing: 1px;
                    ">
                        ✓ ELEMENT FINALIZAT
                    </div>
                </div>

                <!-- Main Card -->
                <div style="
                    background: linear-gradient(180deg, #18181b 0%, #09090b 100%);
                    border-radius: 20px;
                    border: 1px solid #27272a;
                    padding: 32px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                ">
                    <!-- Notification Title -->
                    <h1 style="color: #f3f4f6; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                        ${completedByUser.name} a finalizat un element
                    </h1>
                    <p style="color: #9ca3af; font-size: 14px; margin: 0 0 24px 0;">
                        ${dateStr}
                    </p>

                    <!-- Completed Item -->
                    <div style="
                        background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1));
                        border: 2px solid #22c55e;
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 24px;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <div style="
                                width: 48px;
                                height: 48px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, #8b5cf6, #ec4899);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 20px;
                                color: white;
                                font-weight: 700;
                            ">${completedByUser.name.charAt(0)}</div>
                            <div>
                                <div style="color: #f3f4f6; font-weight: 600; font-size: 16px;">${completedByUser.name}</div>
                                <div style="color: #9ca3af; font-size: 13px;">${completedByUser.email}</div>
                            </div>
                        </div>
                        <div style="
                            font-size: 20px;
                            font-weight: 700;
                            color: #22c55e;
                        ">
                            ✅ ${completedItem.title}
                        </div>
                    </div>

                    <!-- Hierarchy Chain -->
                    <h2 style="color: #9ca3af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
                        Lanțul ierarhic
                    </h2>
                    
                    <div style="margin-bottom: 24px;">
                        ${hierarchyHtml}
                    </div>
                </div>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 32px;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                        Acest email a fost trimis automat de sistemul LRH Flow
                    </p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    // Send email to all recipients
    let success = true;
    for (const email of recipientEmails) {
        const sent = await sendEmail(ceoUser.id, {
            to: email,
            subject: `✅ ${completedByUser.name} a finalizat: ${completedItem.title}`,
            body: htmlBody,
            isHtml: true,
        });
        if (!sent) success = false;
    }

    return success;
}

