-- ============================================================================
-- Supabase Security Policies for CubeCounter
-- ============================================================================
-- Run these in Supabase Dashboard > SQL Editor
-- These enforce security at the DATABASE LEVEL (primary defense)
-- Client-side validation in SupabaseRecordRepository is defense-in-depth only
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE cube_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE miracle_time_schedules ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. RLS POLICIES FOR cube_usage_events
-- ----------------------------------------------------------------------------

-- Allow anonymous (anon key) to READ all records
CREATE POLICY "Allow anonymous read" ON cube_usage_events
  FOR SELECT USING (true);

-- Allow anonymous (anon key) to INSERT with validation via CHECK constraints
-- The CHECK constraints below enforce data integrity
CREATE POLICY "Allow anonymous insert" ON cube_usage_events
  FOR INSERT WITH CHECK (true);

-- If you need authenticated users to UPDATE/DELETE their own records:
-- CREATE POLICY "Allow authenticated update own" ON cube_usage_events
--   FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Allow authenticated delete own" ON cube_usage_events
--   FOR DELETE USING (auth.uid() = user_id);

-- For admin/service role: full access (bypasses RLS automatically)
-- No policy needed - service role bypasses RLS

-- ----------------------------------------------------------------------------
-- 3. RLS POLICIES FOR miracle_time_schedules
-- ----------------------------------------------------------------------------

-- Allow anonymous read
CREATE POLICY "Allow anonymous read miracle schedules" ON miracle_time_schedules
  FOR SELECT USING (true);

-- Allow anonymous insert (for admin UI)
CREATE POLICY "Allow anonymous insert miracle schedules" ON miracle_time_schedules
  FOR INSERT WITH CHECK (true);

-- Allow anonymous update/delete (for admin UI)
CREATE POLICY "Allow anonymous update miracle schedules" ON miracle_time_schedules
  FOR UPDATE WITH CHECK (true);

CREATE POLICY "Allow anonymous delete miracle schedules" ON miracle_time_schedules
  FOR DELETE USING (true);

-- ----------------------------------------------------------------------------
-- 4. CHECK CONSTRAINTS FOR DATA INTEGRITY (cube_usage_events)
-- ----------------------------------------------------------------------------

-- Valid potential_type values
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_potential_type
  CHECK (potential_type IN ('potential', 'additional_potential'));

-- Valid cube_type per potential_type combination
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_cube_type
  CHECK (
    (potential_type = 'potential' AND cube_type IN ('neo', 'mega')) OR
    (potential_type = 'additional_potential' AND cube_type = 'neo_additional')
  );

-- Valid grade_before values
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_before
  CHECK (grade_before IN ('rare', 'epic', 'unique', 'legendary'));

-- Valid grade_after values
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_after
  CHECK (grade_after IN ('rare', 'epic', 'unique', 'legendary'));

-- Valid grade transitions (adjacent forward only: rare->epic, epic->unique, unique->legendary)
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_transition
  CHECK (
    (grade_before = 'rare' AND grade_after = 'epic') OR
    (grade_before = 'epic' AND grade_after = 'unique') OR
    (grade_before = 'unique' AND grade_after = 'legendary')
  );

-- Valid quantity range
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_quantity
  CHECK (quantity_used >= 1 AND quantity_used <= 9999);

-- Valid character_name (null or max 50 chars, no HTML-significant chars)
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_character_name
  CHECK (
    character_name IS NULL OR
    (char_length(character_name) <= 50 AND character_name !~ '[<>&"\'']')
  );

-- Valid server_name
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_server_name
  CHECK (server_name IN ('かえで', 'ゆかり', 'くるみ', 'チャレンジャーズ'));

-- Valid equipment_parts
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_equipment_parts
  CHECK (
    equipment_parts IS NULL OR
    equipment_parts IN ('weapon', 'hat', 'gloves', 'shoes', 'overall', 'accessory', 'other')
  );

-- Valid grade_transition (1, 2, or 3)
ALTER TABLE cube_usage_events ADD CONSTRAINT valid_grade_transition_num
  CHECK (grade_transition IN (1, 2, 3));

-- ----------------------------------------------------------------------------
-- 5. CHECK CONSTRAINTS FOR miracle_time_schedules
-- ----------------------------------------------------------------------------

ALTER TABLE miracle_time_schedules ADD CONSTRAINT valid_miracle_label
  CHECK (char_length(label) <= 100);

ALTER TABLE miracle_time_schedules ADD CONSTRAINT valid_miracle_time_range
  CHECK (end_time > start_time);

-- ----------------------------------------------------------------------------
-- 6. ANON KEY PERMISSIONS (run as postgres/superuser)
-- ----------------------------------------------------------------------------

-- Revoke excessive permissions
REVOKE ALL ON cube_usage_events FROM anon;
REVOKE ALL ON miracle_time_schedules FROM anon;

-- Grant only what's needed
GRANT SELECT, INSERT ON cube_usage_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON miracle_time_schedules TO anon;

-- Grant sequence usage for auto-increment IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ----------------------------------------------------------------------------
-- 7. VERIFICATION QUERIES
-- ----------------------------------------------------------------------------

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('cube_usage_events', 'miracle_time_schedules');

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('cube_usage_events', 'miracle_time_schedules');

-- List all check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN (
  'cube_usage_events'::regclass,
  'miracle_time_schedules'::regclass
) AND contype = 'c';

-- Test anon permissions
-- SET ROLE anon;
-- INSERT INTO cube_usage_events (server_name, potential_type, cube_type, grade_before, grade_after, quantity_used, character_name, timestamp, equipment_parts)
-- VALUES ('かえで', 'potential', 'neo', 'rare', 'epic', 1, 'TestUser', NOW(), 'weapon');
-- Should succeed

-- INSERT INTO cube_usage_events (server_name, potential_type, cube_type, grade_before, grade_after, quantity_used)
-- VALUES ('invalid', 'potential', 'neo', 'rare', 'epic', 1);
-- Should fail: valid_server_name constraint

-- INSERT INTO cube_usage_events (server_name, potential_type, cube_type, grade_before, grade_after, quantity_used)
-- VALUES ('かえで', 'potential', 'invalid_cube', 'rare', 'epic', 1);
-- Should fail: valid_cube_type constraint

-- RESET ROLE;