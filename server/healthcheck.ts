import { db } from "./db";
import { users, departments, tasks, mainGoals, sessions } from "../shared/schema";
import { count, sql } from "drizzle-orm";

export interface HealthCheckResult {
    status: "OK" | "WARNING" | "ERROR";
    component: string;
    message: string;
    details?: any;
}

export interface SystemHealth {
    overall: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    timestamp: string;
    checks: HealthCheckResult[];
    summary: {
        total: number;
        ok: number;
        warnings: number;
        errors: number;
    };
}

// Check database connection
async function checkDatabase(): Promise<HealthCheckResult> {
    try {
        const result = await db.execute(sql`SELECT 1 as test`);
        return {
            status: "OK",
            component: "Database",
            message: "Conexiune reușită la baza de date",
        };
    } catch (error: any) {
        return {
            status: "ERROR",
            component: "Database",
            message: "Nu s-a putut conecta la baza de date",
            details: error.message,
        };
    }
}

// Check required tables exist
async function checkTables(): Promise<HealthCheckResult> {
    try {
        const [userCount] = await db.select({ count: count() }).from(users);
        const [deptCount] = await db.select({ count: count() }).from(departments);
        const [taskCount] = await db.select({ count: count() }).from(tasks);
        const [goalCount] = await db.select({ count: count() }).from(mainGoals);

        return {
            status: "OK",
            component: "Tables",
            message: "Toate tabelele există și sunt accesibile",
            details: {
                users: userCount.count,
                departments: deptCount.count,
                tasks: taskCount.count,
                mainGoals: goalCount.count,
            },
        };
    } catch (error: any) {
        return {
            status: "ERROR",
            component: "Tables",
            message: "Eroare la accesarea tabelelor",
            details: error.message,
        };
    }
}

// Check users table has required columns
async function checkUserSchema(): Promise<HealthCheckResult> {
    try {
        const result = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);

        const columns = (result.rows as any[]).map(r => r.column_name);
        const requiredColumns = [
            "id", "email", "name", "microsoft_id",
            "microsoft_access_token", "microsoft_refresh_token", "microsoft_token_expiry",
            "role", "is_active"
        ];

        const missingColumns = requiredColumns.filter(col => !columns.includes(col));

        if (missingColumns.length > 0) {
            return {
                status: "ERROR",
                component: "User Schema",
                message: `Lipsesc coloane din tabelul users: ${missingColumns.join(", ")}`,
                details: { existing: columns, missing: missingColumns },
            };
        }

        return {
            status: "OK",
            component: "User Schema",
            message: "Schema tabelului users este completă",
            details: { columns: columns.length },
        };
    } catch (error: any) {
        return {
            status: "ERROR",
            component: "User Schema",
            message: "Nu s-a putut verifica schema users",
            details: error.message,
        };
    }
}

// Check Microsoft OAuth configuration
function checkMicrosoftOAuth(): HealthCheckResult {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID;

    const missing: string[] = [];
    if (!clientId) missing.push("MICROSOFT_CLIENT_ID");
    if (!clientSecret) missing.push("MICROSOFT_CLIENT_SECRET");

    if (missing.length > 0) {
        return {
            status: "ERROR",
            component: "Microsoft OAuth",
            message: `Lipsesc variabile de mediu: ${missing.join(", ")}`,
        };
    }

    return {
        status: "OK",
        component: "Microsoft OAuth",
        message: "Configurația Microsoft OAuth este completă",
        details: {
            clientIdSet: !!clientId,
            clientSecretSet: !!clientSecret,
            tenantId: tenantId || "common",
        },
    };
}

// Check session configuration
function checkSessionConfig(): HealthCheckResult {
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionSecret) {
        return {
            status: "WARNING",
            component: "Session",
            message: "SESSION_SECRET nu este setat - se folosește valoare default",
        };
    }

    return {
        status: "OK",
        component: "Session",
        message: "Configurația sesiunii este corectă",
    };
}

// Check environment
function checkEnvironment(): HealthCheckResult {
    const env = process.env.NODE_ENV || "development";
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
        return {
            status: "ERROR",
            component: "Environment",
            message: "DATABASE_URL nu este setat",
        };
    }

    const isNeon = dbUrl.includes("neon.tech");
    const isProd = env === "production";

    return {
        status: "OK",
        component: "Environment",
        message: `Rulează în modul ${env}`,
        details: {
            nodeEnv: env,
            databaseProvider: isNeon ? "Neon" : "Other PostgreSQL",
            databaseConnected: !!dbUrl,
        },
    };
}

// Run all health checks
export async function runHealthCheck(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];

    // Run all checks
    checks.push(checkEnvironment());
    checks.push(checkMicrosoftOAuth());
    checks.push(checkSessionConfig());
    checks.push(await checkDatabase());
    checks.push(await checkTables());
    checks.push(await checkUserSchema());

    // Calculate summary
    const summary = {
        total: checks.length,
        ok: checks.filter(c => c.status === "OK").length,
        warnings: checks.filter(c => c.status === "WARNING").length,
        errors: checks.filter(c => c.status === "ERROR").length,
    };

    // Determine overall status
    let overall: "HEALTHY" | "DEGRADED" | "UNHEALTHY" = "HEALTHY";
    if (summary.errors > 0) overall = "UNHEALTHY";
    else if (summary.warnings > 0) overall = "DEGRADED";

    return {
        overall,
        timestamp: new Date().toISOString(),
        checks,
        summary,
    };
}

// Run health check on startup and log results
export async function startupDiagnostics(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 STARTUP DIAGNOSTICS - LRH Flow System");
    console.log("=".repeat(60) + "\n");

    const health = await runHealthCheck();

    for (const check of health.checks) {
        const icon = check.status === "OK" ? "✅" : check.status === "WARNING" ? "⚠️" : "❌";
        console.log(`${icon} [${check.component}] ${check.message}`);
        if (check.details && check.status !== "OK") {
            console.log(`   Details: ${JSON.stringify(check.details)}`);
        }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`📊 Summary: ${health.summary.ok}/${health.summary.total} OK | ${health.summary.warnings} Warnings | ${health.summary.errors} Errors`);
    console.log(`🏥 Overall Status: ${health.overall}`);
    console.log("-".repeat(60) + "\n");

    if (health.overall === "UNHEALTHY") {
        console.error("⚠️  CRITICAL: System has errors that need to be fixed!");
    }
}
