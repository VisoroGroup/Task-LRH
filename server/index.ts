import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import { createServer } from "http";
import cron from "node-cron";

import { seedDatabase } from "./seed";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { startupDiagnostics, runHealthCheck } from "./healthcheck";
import { sendDailyTasksToAllUsers } from "./jobs/dailyTasksNotification";

const app = express();

// DEBUG: Ultra-minimal ping endpoint BEFORE any middleware
// This tests if Express is receiving requests at all
app.get("/ping", (req, res) => {
    res.status(200).send("pong");
});

console.log("[DEBUG] Express app created, /ping endpoint registered");

// Trust proxy for production (Replit, Heroku, etc.)
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || "lrh-flow-system-secret-dev";

app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
}));

// Register authentication routes
registerAuthRoutes(app);

// Register API routes
registerRoutes(app);

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/api/health", async (req, res) => {
    const health = await runHealthCheck();
    const statusCode = health.overall === "HEALTHY" ? 200 : health.overall === "DEGRADED" ? 200 : 503;
    res.status(statusCode).json(health);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

const PORT = parseInt(process.env.PORT || "5000", 10);

async function start() {
    try {
        // Run startup diagnostics
        await startupDiagnostics();

        // Seed the database with default data
        await seedDatabase();

        const server = createServer(app);

        // Setup Vite in development or serve static files in production
        if (process.env.NODE_ENV === "production") {
            serveStatic(app);
        } else {
            await setupVite(app, server);
        }

        server.listen(PORT, "0.0.0.0", () => {
            log(`Server running on port ${PORT}`);
            log(`Environment: ${process.env.NODE_ENV || "development"}`);

            // Schedule daily email notifications at 7:00 AM (Europe/Bucharest timezone)
            // Cron format: minute hour day month weekday (1-5 = Monday-Friday)
            cron.schedule("0 7 * * 1-5", async () => {
                log("Running scheduled daily task email job...");
                try {
                    const result = await sendDailyTasksToAllUsers();
                    log(`Daily emails: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
                } catch (error) {
                    console.error("Daily email job failed:", error);
                }
            }, {
                timezone: "Europe/Bucharest"
            });
            log("Daily email notification cron job scheduled for 7:00 AM (Mon-Fri)");
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

start();
