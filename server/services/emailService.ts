import nodemailer from "nodemailer";

// Outlook SMTP configuration
const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // TLS
    auth: {
        user: process.env.SMTP_USER || "office@visoro-global.ro",
        pass: process.env.SMTP_PASS,
    },
    tls: {
        ciphers: "SSLv3",
    },
});

export interface DailyTaskEmail {
    recipientEmail: string;
    recipientName: string;
    tasks: {
        title: string;
        postName: string;
        departmentName: string;
        dueTime?: string | null;
    }[];
    date: Date;
}

export async function sendDailyTasksEmail(data: DailyTaskEmail): Promise<boolean> {
    if (!process.env.SMTP_PASS) {
        console.warn("SMTP_PASS not configured, skipping email send");
        return false;
    }

    if (data.tasks.length === 0) {
        console.log(`No tasks for ${data.recipientName}, skipping email`);
        return false;
    }

    const dateStr = data.date.toLocaleDateString("ro-RO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    // Group tasks by department
    const tasksByDept = new Map<string, typeof data.tasks>();
    for (const task of data.tasks) {
        const existing = tasksByDept.get(task.departmentName) || [];
        existing.push(task);
        tasksByDept.set(task.departmentName, existing);
    }

    // Generate HTML content
    const departmentSections = Array.from(tasksByDept.entries())
        .map(
            ([dept, tasks]) => `
        <div style="margin-bottom: 24px;">
            <h3 style="color: #6366f1; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                📁 ${dept}
            </h3>
            <ul style="margin: 0; padding: 0; list-style: none;">
                ${tasks
                    .map(
                        (task) => `
                    <li style="padding: 10px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                        <div style="font-weight: 500; color: #1f2937;">${task.title}</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                            📌 ${task.postName}
                            ${task.dueTime ? ` • ⏰ ${task.dueTime}` : ""}
                        </div>
                    </li>
                `
                    )
                    .join("")}
            </ul>
        </div>
    `
        )
        .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Teendőid mára</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${dateStr}</p>
        </div>
        
        <!-- Greeting -->
        <div style="padding: 24px 32px 0 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0;">
                Bună dimineața, <strong>${data.recipientName}</strong>! 👋
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
                Iată sarcinile tale pentru astăzi:
            </p>
        </div>
        
        <!-- Tasks -->
        <div style="padding: 24px 32px;">
            ${departmentSections}
        </div>
        
        <!-- Summary -->
        <div style="padding: 0 32px 24px 32px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 16px; text-align: center;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">
                    📊 Total: ${data.tasks.length} ${data.tasks.length === 1 ? "sarcină" : "sarcini"} de realizat
                </p>
            </div>
        </div>
        
        <!-- CTA Button -->
        <div style="padding: 0 32px 32px 32px; text-align: center;">
            <a href="${process.env.APP_URL || "https://your-app.railway.app"}" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Deschide aplicația →
            </a>
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Acest email a fost trimis automat de Task Manager.
                <br>O zi productivă! 🚀
            </p>
        </div>
    </div>
</body>
</html>
    `;

    try {
        await transporter.sendMail({
            from: `"Task Manager" <${process.env.SMTP_USER || "office@visoro-global.ro"}>`,
            to: data.recipientEmail,
            subject: `📋 Sarcinile tale pentru ${dateStr}`,
            html,
        });
        console.log(`Daily tasks email sent to ${data.recipientEmail}`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${data.recipientEmail}:`, error);
        return false;
    }
}

export async function verifyEmailConnection(): Promise<boolean> {
    try {
        await transporter.verify();
        console.log("SMTP connection verified successfully");
        return true;
    } catch (error) {
        console.error("SMTP connection failed:", error);
        return false;
    }
}
