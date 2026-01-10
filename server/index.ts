import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

import { db } from "./db";
import { seedDatabase } from "./seed";
import { registerRoutes } from "./routes";
import { registerAuthRoutes } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
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
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));

// Register authentication routes
registerAuthRoutes(app);

// Register API routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "public")));

    // SPA fallback
    app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
            res.sendFile(path.join(__dirname, "public", "index.html"));
        }
    });
}

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

        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

start();
