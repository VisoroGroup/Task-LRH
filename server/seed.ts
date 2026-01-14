import { db } from "./db";
import { departments, users, settings } from "@shared/schema";
import { eq } from "drizzle-orm";

// Default 7 departments in correct order
const defaultDepartments = [
    {
        id: "dept-admin",
        name: "Administrativ",
        description: "Internal administration, coordination, documentation, organizational control",
        sortOrder: 1,
    },
    {
        id: "dept-hr",
        name: "HR-Comunicare",
        description: "Recruitment, training, onboarding, personnel handling, internal communication",
        sortOrder: 2,
    },
    {
        id: "dept-sales",
        name: "Vânzări",
        description: "Sales activity, lead handling, contracts, client communication",
        sortOrder: 3,
    },
    {
        id: "dept-finance",
        name: "Financiar",
        description: "Invoicing, cashflow, payments, financial control",
        sortOrder: 4,
    },
    {
        id: "dept-production",
        name: "Producție",
        description: "Service delivery, execution, operational output",
        sortOrder: 5,
    },
    {
        id: "dept-quality",
        name: "Calitate",
        description: "Quality control, verification, correction, standards enforcement",
        sortOrder: 6,
    },
    {
        id: "dept-expansion",
        name: "Extindere",
        description: "PR, marketing, partnerships, expansion activities",
        sortOrder: 7,
    },
];

// Default system settings
const defaultSettings = [
    {
        key: "stalled_threshold_days",
        value: { days: 3 }, // Default 3 days for stalled detection
    },
    {
        key: "overload_threshold",
        value: { tasks: 10 }, // Default 10 tasks = overload indicator
    },
];

export async function seedDatabase() {
    console.log("🌱 Seeding database...");

    try {
        // Seed departments
        for (const dept of defaultDepartments) {
            const existing = await db.query.departments.findFirst({
                where: eq(departments.id, dept.id),
            });

            if (!existing) {
                await db.insert(departments).values({
                    id: dept.id,
                    name: dept.name,
                    description: dept.description,
                    sortOrder: dept.sortOrder,
                    isActive: true,
                });
                console.log(`  ✓ Created department: ${dept.name}`);
            } else {
                // Update sortOrder for existing departments
                await db.update(departments)
                    .set({ sortOrder: dept.sortOrder })
                    .where(eq(departments.id, dept.id));
                console.log(`  - Department exists: ${dept.name} (updated sortOrder)`);
            }
        }

        // Seed default settings
        for (const setting of defaultSettings) {
            const existing = await db.query.settings.findFirst({
                where: eq(settings.key, setting.key),
            });

            if (!existing) {
                await db.insert(settings).values({
                    key: setting.key,
                    value: setting.value,
                });
                console.log(`  ✓ Created setting: ${setting.key}`);
            }
        }

        // Create a default CEO user for testing (if not exists)
        const existingCeo = await db.query.users.findFirst({
            where: eq(users.email, "ceo@example.com"),
        });

        if (!existingCeo) {
            await db.insert(users).values({
                id: "user-ceo",
                email: "ceo@example.com",
                name: "CEO",
                role: "CEO",
                isActive: true,
            });
            console.log("  ✓ Created default CEO user");
        }

        console.log("✅ Database seeding complete!");
    } catch (error) {
        console.error("❌ Error seeding database:", error);
        throw error;
    }
}
