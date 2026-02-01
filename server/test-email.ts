/**
 * Test script to send a test email via Resend
 * Run with: RESEND_API_KEY=re_xxx npx tsx server/test-email.ts
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RECIPIENT_EMAIL = "socialmediavisoro@gmail.com"; // Resend verified email for testing

if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY environment variable is required!");
    console.log("Usage: RESEND_API_KEY=re_xxx npx tsx server/test-email.ts");
    process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const dateStr = new Date().toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
});

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
            <h1 style="color: white; margin: 0; font-size: 24px;">📋 Sarcinile tale pentru azi</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">${dateStr}</p>
        </div>
        
        <!-- Greeting -->
        <div style="padding: 24px 32px 0 32px;">
            <p style="color: #374151; font-size: 16px; margin: 0;">
                Bună dimineața, <strong>Róbert</strong>! 👋
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
                Iată sarcinile tale pentru astăzi:
            </p>
        </div>
        
        <!-- Tasks -->
        <div style="padding: 24px 32px;">
            <div style="margin-bottom: 24px;">
                <h3 style="color: #6366f1; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                    📁 Management
                </h3>
                <ul style="margin: 0; padding: 0; list-style: none;">
                    <li style="padding: 10px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                        <div style="font-weight: 500; color: #1f2937;">Finalizează raportul lunar</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                            📌 Director Executiv • ⏰ 10:00
                        </div>
                    </li>
                    <li style="padding: 10px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                        <div style="font-weight: 500; color: #1f2937;">Verifică contractele</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                            📌 Director Executiv • ⏰ 14:00
                        </div>
                    </li>
                </ul>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h3 style="color: #6366f1; font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
                    📁 Sales
                </h3>
                <ul style="margin: 0; padding: 0; list-style: none;">
                    <li style="padding: 10px 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
                        <div style="font-weight: 500; color: #1f2937;">Sună partenerii</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
                            📌 Sales Manager
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        
        <!-- Summary -->
        <div style="padding: 0 32px 24px 32px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 16px; text-align: center;">
                <p style="color: #92400e; margin: 0; font-weight: 600;">
                    📊 Total: 3 sarcini de realizat
                </p>
            </div>
        </div>
        
        <!-- CTA Button -->
        <div style="padding: 0 32px 32px 32px; text-align: center;">
            <a href="https://task-lrh-production.up.railway.app" 
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

async function sendTestEmail() {
    console.log(`\n📧 Sending test email to ${RECIPIENT_EMAIL}...\n`);

    try {
        const { data, error } = await resend.emails.send({
            from: "Task Manager <onboarding@resend.dev>",
            to: RECIPIENT_EMAIL,
            subject: `📋 [TEST] Sarcinile tale pentru ${dateStr}`,
            html,
        });

        if (error) {
            console.error("❌ Error sending email:", error);
            process.exit(1);
        }

        console.log("✅ Email sent successfully!");
        console.log("📬 Email ID:", data?.id);
        console.log(`\n👀 Check your inbox at ${RECIPIENT_EMAIL}\n`);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

sendTestEmail();
