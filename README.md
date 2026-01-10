# LRH Flow System

An organizational control and flow system based on L. Ron Hubbard management technology for CEO-level oversight.

## Features

- **Ideal Scene Hierarchy**: Main Goal → Subgoal → Program → Project → Instruction
- **CEO Dashboard**: KPI cards, executive grid, stalled task detection
- **Departments**: 7 default organizational functions with soft delete
- **Tasks**: Single responsibility, mandatory hierarchy context
- **Completion Reports**: Evidence-based completion (no "ready" or "ok" accepted)

## Setup on Replit

1. Import this repo from GitHub
2. Replit will automatically provision a PostgreSQL database
3. The `DATABASE_URL` secret will be set automatically
4. **Set up Microsoft OAuth** (see below)
5. Run `npm run db:push` in the shell to create tables
6. Click "Run" to start the server

## Microsoft Azure AD Setup

To enable "Sign in with Microsoft":

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory
2. App registrations → New registration
3. Name: "LRH Flow System"
4. Redirect URI: `https://your-replit-url.repl.co/api/auth/microsoft/callback`
5. After creation, copy **Application (client) ID** and **Directory (tenant) ID**
6. Certificates & secrets → New client secret → Copy the **Value**
7. In Replit Secrets, add:
   - `MICROSOFT_CLIENT_ID` = Application (client) ID
   - `MICROSOFT_CLIENT_SECRET` = Client secret value
   - `MICROSOFT_TENANT_ID` = Directory (tenant) ID
   - `SESSION_SECRET` = Any random string

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Radix UI
- **Backend**: Express, Drizzle ORM
- **Database**: PostgreSQL

## LRH Principles Enforced

- One task = one responsible person
- Tasks require hierarchy context
- DONE status requires completion report with evidence
- Stalled detection (configurable threshold)
- Department protection (cannot delete with active work)
