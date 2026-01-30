import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        if (
          msg.includes("[TypeScript] Found 0 errors. Watching for file changes")
        ) {
          log("no errors found", "tsc");
          return;
        }
        if (msg.includes("[TypeScript]")) {
          const [errors, summary] = msg.split(
            "[TypeScript] Found ",
          );
          log(`${summary}`, "tsc");
          console.error(errors);
          return;
        }
        viteLogger.error(msg, options);
      },
    },
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(__dirname, "..", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production ESM bundle, __dirname might not point where we expect
  // Use process.cwd() which is the project root on Replit
  const distPath = path.resolve(process.cwd(), "dist", "public");

  console.log("[serveStatic] Attempting to serve from:", distPath);
  console.log("[serveStatic] Directory exists:", fs.existsSync(distPath));

  if (!fs.existsSync(distPath)) {
    // Fallback: try relative to __dirname
    const fallbackPath = path.resolve(__dirname, "public");
    console.log("[serveStatic] Trying fallback path:", fallbackPath);
    console.log("[serveStatic] Fallback exists:", fs.existsSync(fallbackPath));

    if (fs.existsSync(fallbackPath)) {
      app.use(express.static(fallbackPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
          return next();
        }
        res.sendFile(path.resolve(fallbackPath, "index.html"));
      });
      return;
    }

    throw new Error(
      `Could not find the production build directory at ${distPath} or ${fallbackPath}. Make sure to run "npm run build" first.`,
    );
  }

  app.use(express.static(distPath));

  // Catch-all for SPA routing - but EXCLUDE /api routes!
  app.get("*", (req, res, next) => {
    // If it's an API route, skip - let other handlers deal with it
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
