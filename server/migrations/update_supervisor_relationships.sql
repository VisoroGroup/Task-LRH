-- Update Supervisor Relationships Migration
-- Run this on Replit: npx drizzle-kit push or manually in SQL console

-- Organizational Structure:
-- Róbert LEDÉNYI (CEO) - no supervisor
--   ├── Emőke Ledényi (EXECUTIVE) - supervisor: Róbert
--   │   ├── István Szőcs
--   │   ├── András Kovásznai  
--   │   ├── Dóra Jakab
--   │   ├── Székely Boglárka
--   │   ├── Sergiu Tautan
--   │   └── Lorin Batinas
--   └── Mária Vaszi (EXECUTIVE) - supervisor: Róbert
--       ├── Alisa Marincas
--       ├── Dorin Dontu
--       ├── Dorin Apahidean
--       ├── Ioan Caradan
--       └── Árpád Nagy

-- First, get CEO's ID (Róbert LEDÉNYI)
-- Then set supervisorId for EXECUTIVES (Emőke, Mária) to CEO
-- Then set supervisorId for USERS to their respective EXECUTIVE

-- Set Emőke Ledényi's supervisor to Róbert LEDÉNYI
UPDATE users 
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Róbert%' AND role = 'CEO' LIMIT 1)
WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE';

-- Set Mária Vaszi's supervisor to Róbert LEDÉNYI  
UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Róbert%' AND role = 'CEO' LIMIT 1)
WHERE name ILIKE '%Mária%' AND role = 'EXECUTIVE';

-- Set Emőke's team supervisors
UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%István Szőcs%' OR name ILIKE '%Szőcs István%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%András Kovásznai%' OR name ILIKE '%Kovásznai András%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Dóra Jakab%' OR name ILIKE '%Jakab Dóra%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Székely Boglárka%' OR name ILIKE '%Boglárka Székely%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Sergiu Tautan%' OR name ILIKE '%Tautan Sergiu%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Emőke%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Lorin Batinas%' OR name ILIKE '%Batinas Lorin%';

-- Set Mária's team supervisors
UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Mária%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Alisa Marincas%' OR name ILIKE '%Marincas Alisa%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Mária%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Dorin Dontu%' OR name ILIKE '%Dontu Dorin%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Mária%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Dorin Apahidean%' OR name ILIKE '%Apahidean Dorin%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Mária%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Ioan Caradan%' OR name ILIKE '%Caradan Ioan%';

UPDATE users
SET supervisor_id = (SELECT id FROM users WHERE name ILIKE '%Mária%' AND role = 'EXECUTIVE' LIMIT 1)
WHERE name ILIKE '%Árpád Nagy%' OR name ILIKE '%Nagy Árpád%';

-- Verify results
SELECT name, role, supervisor_id, 
       (SELECT name FROM users u2 WHERE u2.id = users.supervisor_id) as supervisor_name
FROM users
ORDER BY role, name;
