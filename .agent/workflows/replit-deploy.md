---
description: Replit production deployment checklist - ALWAYS follow this
---

# Replit Production Deployment Workflow

## KRITIKUS: Replit-ben VAN Development ÉS Production adatbázis külön!

// turbo-all

## 1. Kód frissítés (Replit Shell-ben)
```bash
git fetch --all && git reset --hard origin/main && npm run build
```

## 2. Ha van új DB oszlop/tábla (schema változás):
A **Production Database**-t KÜLÖN kell frissíteni!

Replit → Database panel → **Production Database** → SQL Console:
```sql
-- Futtasd a szükséges ALTER TABLE parancsokat
```

VAGY Shell-ben (figyelj, hogy Production env legyen):
```bash
psql "$DATABASE_URL" -c "ALTER TABLE ..."
```

## 3. Ha user role-t kell változtatni:
Production DB-ben kell futtatni:
```sql
UPDATE users SET role = 'CEO' WHERE email = 'user@example.com';
```

## 4. Republish
Kattints a **Republish** gombra a Replit-ben (jobb felső sarok)

## 5. Tesztelés után
- Cookie törlés a böngészőben
- Login újra
- Ellenőrizd: `https://[app-name].replit.app/api/health`

---

## FIGYELMEZTETÉSEK:

⚠️ **Development Database ≠ Production Database** - Mindig ellenőrizd, melyikben dolgozol!

⚠️ **Session/cookie**: Ha a user role vagy más session adat változott, a usernek ki kell lépnie és újra be kell lépnie.

⚠️ **Azure Redirect URI**: Ha új domain-re deploy-olsz, hozzá kell adni a redirect URI-t az Azure App Registration-ben → Authentication → Add URI.
