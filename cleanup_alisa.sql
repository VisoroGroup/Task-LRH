-- Cleanup script for Alisa Marincas assignments
-- User ID: 199f7600-1186-48fb-bd0e-03c478a89911

-- First, find posts for this user
-- SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911';

-- Clear all hierarchy assignments for Alisa's posts
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

-- If checklists table exists
-- UPDATE checklists SET "assignedPostId" = NULL 
-- WHERE "assignedPostId" IN (SELECT id FROM posts WHERE "userId" = '199f7600-1186-48fb-bd0e-03c478a89911');
