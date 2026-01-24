import { Request, Response, NextFunction, Express } from "express";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// Extend Express session type
declare module "express-session" {
    interface SessionData {
        userId?: string;
        userRole?: string;
    }
}

// Microsoft OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";

// Build redirect URI based on environment
function getRedirectUri(req: Request): string {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host;
    return `${protocol}://${host}/api/auth/microsoft/callback`;
}

// Current user info from session
export async function getCurrentUser(req: Request) {
    if (!req.session?.userId) return null;

    const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId),
    });

    return user;
}

// Authentication middleware - requires login
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
}

// Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.session?.userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!allowedRoles.includes(req.session.userRole || "USER")) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }

        next();
    };
}

// Register authentication routes
export function registerAuthRoutes(app: Express) {
    // Get current user
    app.get("/api/auth/me", async (req: Request, res: Response) => {
        const user = await getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        // Don't send password
        const { password, ...safeUser } = user;
        res.json(safeUser);
    });

    // Microsoft OAuth - initiate login
    app.get("/api/auth/microsoft", (req: Request, res: Response) => {
        if (!MICROSOFT_CLIENT_ID) {
            return res.status(500).json({ error: "Microsoft OAuth not configured" });
        }

        const redirectUri = getRedirectUri(req);
        const scope = "openid profile email User.Read Calendars.ReadWrite offline_access";

        const authUrl = new URL(`https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`);
        authUrl.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("scope", scope);
        authUrl.searchParams.set("response_mode", "query");

        res.redirect(authUrl.toString());
    });

    // Microsoft OAuth - callback
    app.get("/api/auth/microsoft/callback", async (req: Request, res: Response) => {
        const { code, error } = req.query;

        if (error) {
            console.error("OAuth error:", error);
            return res.redirect("/?auth_error=oauth_denied");
        }

        if (!code || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
            return res.redirect("/?auth_error=missing_config");
        }

        try {
            const redirectUri = getRedirectUri(req);

            // Exchange code for tokens
            const tokenResponse = await fetch(
                `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({
                        client_id: MICROSOFT_CLIENT_ID,
                        client_secret: MICROSOFT_CLIENT_SECRET,
                        code: code as string,
                        redirect_uri: redirectUri,
                        grant_type: "authorization_code",
                    }),
                }
            );

            if (!tokenResponse.ok) {
                const err = await tokenResponse.text();
                console.error("Token exchange failed:", err);
                return res.redirect("/?auth_error=token_failed");
            }

            const tokens = await tokenResponse.json();

            // Get user profile from Microsoft Graph
            const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });

            if (!profileResponse.ok) {
                return res.redirect("/?auth_error=profile_failed");
            }

            const profile = await profileResponse.json();
            const email = profile.mail || profile.userPrincipalName;
            const name = profile.displayName || email;
            const microsoftId = profile.id;

            // Find or create user
            let user = await db.query.users.findFirst({
                where: eq(users.microsoftId, microsoftId),
            });

            if (user) {
                // Update existing user's tokens
                await db.update(users)
                    .set({
                        microsoftAccessToken: tokens.access_token,
                        microsoftRefreshToken: tokens.refresh_token || user.microsoftRefreshToken,
                        microsoftTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                        updatedAt: new Date(),
                    })
                    .where(eq(users.id, user.id));
            }

            if (!user) {
                // Check if user exists by email
                user = await db.query.users.findFirst({
                    where: eq(users.email, email),
                });

                if (user) {
                    // Link existing user to Microsoft account and save tokens
                    await db.update(users)
                        .set({
                            microsoftId,
                            microsoftAccessToken: tokens.access_token,
                            microsoftRefreshToken: tokens.refresh_token,
                            microsoftTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                            avatarUrl: null,
                            updatedAt: new Date()
                        })
                        .where(eq(users.id, user.id));
                } else {
                    // Create new user with tokens
                    const [newUser] = await db.insert(users).values({
                        email,
                        name,
                        microsoftId,
                        microsoftAccessToken: tokens.access_token,
                        microsoftRefreshToken: tokens.refresh_token,
                        microsoftTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                        role: "USER", // Default role, admin can upgrade later
                    }).returning();
                    user = newUser;
                }
            }

            // Set session
            req.session.userId = user.id;
            req.session.userRole = user.role;

            // Redirect to home
            res.redirect("/");
        } catch (error) {
            console.error("OAuth callback error:", error);
            res.redirect("/?auth_error=callback_failed");
        }
    });

    // Logout
    app.post("/api/auth/logout", (req: Request, res: Response) => {
        req.session.destroy((err) => {
            if (err) {
                console.error("Logout error:", err);
                return res.status(500).json({ error: "Logout failed" });
            }
            res.json({ success: true });
        });
    });

    // Update user role (CEO only)
    app.put("/api/users/:id/role", requireRole("CEO"), async (req: Request, res: Response) => {
        const { id } = req.params;
        const { role } = req.body;

        if (!["CEO", "EXECUTIVE", "USER"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const [updated] = await db
            .update(users)
            .set({ role, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(updated);
    });
}
