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
- **Email Notifications** - Microsoft Graph API-val, hierarchy completion értesítések
- **Completion Tracking** - completedAt/completedById minden hierarchy szinten

### Tech Stack
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **Frontend:** React + Vite + TailwindCSS
- **Auth:** Microsoft OAuth (Azure AD)
- **Email:** Microsoft Graph API
- **Hosting:** Replit

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

### Utolsó Session Változtatásai (2026-01-28)
1. ✅ Type safety javítások - `HierarchyTable` típus
2. ✅ Cascade delete - hierarchy táblák FK-in
3. ✅ Toast notifications - success/error a completion-höz
4. ✅ Loading spinner - Loader2 ikon mutation közben
5. ✅ Supervisor migration script létrehozva

### GitHub Repo
`https://github.com/VisoroGroup/Task-LRH`

### Replit Deployment Parancsok
```bash
# Frissítés GitHub-ról
git reset --hard origin/main && npm run db:push

# Migration futtatása
psql $DATABASE_URL -f server/migrations/update_supervisor_relationships.sql
```
