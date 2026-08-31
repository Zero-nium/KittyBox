-- KittyBox v0.2 — Supabase Schema Update
-- Run in Supabase SQL Editor
-- ============================================

-- Add scritch_count column to cats (if not exists)
ALTER TABLE cats ADD COLUMN IF NOT EXISTS scritch_count INTEGER NOT NULL DEFAULT 0;

-- Create scritches table (if not exists)
CREATE TABLE IF NOT EXISTS scritches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cat_id, session_id)
);

-- Index for leaderboard queries on scritch_count
CREATE INDEX IF NOT EXISTS cats_scritch_count_idx ON cats(scritch_count DESC);
CREATE INDEX IF NOT EXISTS scritches_cat_id_idx ON scritches(cat_id);

-- Enable RLS on scritches
ALTER TABLE scritches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scritches are publicly readable" ON scritches FOR SELECT USING (true);

-- Migrate existing pet_count data to scritch_count (if any)
UPDATE cats SET scritch_count = pet_count WHERE scritch_count = 0 AND pet_count > 0;
