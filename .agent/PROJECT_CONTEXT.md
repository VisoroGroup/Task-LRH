# LRH Flow System - Task Manager

## Projekt Áttekintés
Ez egy LRH (L. Ron Hubbard) alapú task management rendszer, ami a következőket tartalmazza:

### Funkciók
- **Ideal Scene Hierarchy** - 6 szintű struktúra:
  - Misiune (Main Goal)
  - Obiectiv (Subgoal)  
  - Plan
  - Program
  - Proiect (Project)
  - De făcut (Instruction/Task)

- **Recurring Tasks** - ismétlődő feladatok követése
- **Team Management** - supervisor hierarchia, role-based access
- **Post-Based Access Control** - felhasználók csak saját posztjaik tartalmát látják
- **Email Notifications**:
  - Napi email (7:00 H-P) - aznapi feladatok
  - Heti riport (Csütörtök 14:00) - statisztikák per user
- **Completion Tracking** - completedAt/completedById minden hierarchy szinten

### Tech Stack
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Drizzle ORM (NeonDB)
- **Frontend:** React + Vite + TailwindCSS
- **Auth:** Microsoft OAuth (Azure AD)
- **Email:** Resend API
- **Hosting:** Railway (production)

### Szervezeti Hierarchia (supervisor)
```
Róbert LEDÉNYI (CEO)
├── Emőke Ledényi (EXECUTIVE)
│   ├── István Szőcs
│   ├── András Kovásznai
│   ├── Dóra Jakab
│   ├── Székely Boglárka
│   ├── Sergiu Tautan
│   └── Lorin Batinas
└── Mária Vaszi (EXECUTIVE)
    ├── Alisa Marincas
    ├── Dorin Dontu
    ├── Dorin Apahidean
    ├── Ioan Caradan
    └── Árpád Nagy
```

### Utolsó Session Változtatásai (2026-02-01)
1. ✅ Post-based access control - backend filtering
2. ✅ Frontend conditional rendering (edit buttons hidden for non-managers)
3. ✅ Napi email értesítések (7:00 H-P) - Resend API
4. ✅ Heti riport email (Csütörtök 14:00) - összesítő statisztikák
5. ✅ Lazy Resend initialization (server starts without API key)

### GitHub Repo
`https://github.com/VisoroGroup/Task-LRH`

### Railway Environment Variables
```bash
RESEND_API_KEY=re_xxx...
CEO_EMAIL=ledenyi.robert@visoro-global.ro
APP_URL=https://task-lrh-production.up.railway.app
```

### Email Cron Jobs
```typescript
// Napi: Hétfő-Péntek 7:00 (Europe/Bucharest)
cron.schedule("0 7 * * 1-5", sendDailyTasksToAllUsers);

// Heti riport: Csütörtök 14:00 (Europe/Bucharest)
cron.schedule("0 14 * * 4", sendWeeklyReportEmail);
```

### Teszt Parancsok
```bash
# Teszt email küldése lokálisan
RESEND_API_KEY=re_xxx npx tsx server/test-email.ts
```
