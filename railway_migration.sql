-- ============================================
-- MIGRATION: Create checklists tables
-- Run this in Railway Dashboard → PostgreSQL → Data → Query
-- ============================================

-- 1. Create checklists table
CREATE TABLE IF NOT EXISTS checklists (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR NOT NULL,
    description TEXT,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    department_id VARCHAR NOT NULL REFERENCES departments(id),
    assigned_post_id VARCHAR REFERENCES posts(id),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create checklist_items table
CREATE TABLE IF NOT EXISTS checklist_items (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
    checklist_id VARCHAR NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_user_id VARCHAR REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_checklists_project ON checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_checklists_department ON checklists(department_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_sort_order ON checklist_items(checklist_id, sort_order);

-- ============================================
-- CLEANUP: Clear Alisa's assignments
-- ============================================

UPDATE subgoals SET "assignedPostId" = NULL 
WHERE "assignedPostId" IN (SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911');

UPDATE plans SET "assignedPostId" = NULL 
WHERE "assignedPostId" IN (SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911');

UPDATE programs SET "assignedPostId" = NULL 
WHERE "assignedPostId" IN (SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911');

UPDATE projects SET "assignedPostId" = NULL 
WHERE "assignedPostId" IN (SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911');

UPDATE instructions SET "assignedPostId" = NULL 
WHERE "assignedPostId" IN (SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911');
