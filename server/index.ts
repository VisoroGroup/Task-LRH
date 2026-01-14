import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import { createServer } from "http";

import { seedDatabase } from "./seed";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

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
    },
}));

// Register authentication routes
registerAuthRoutes(app);

// Register API routes
registerRoutes(app);

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
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

start();
