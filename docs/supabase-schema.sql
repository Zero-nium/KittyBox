-- KittyBox — Supabase Schema
-- Run in Supabase SQL Editor
-- ============================================

-- cats table
CREATE TABLE IF NOT EXISTS cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  cat_dna JSONB NOT NULL,
  ascii_art TEXT NOT NULL,
  pet_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pets table
CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cat_id, session_id)
);

-- donations table (for future Stripe integration)
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INTEGER NOT NULL DEFAULT 500,
  pet_bundle INTEGER NOT NULL DEFAULT 50,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- world_log table (environment collaboration log)
CREATE TABLE IF NOT EXISTS world_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_code TEXT,
  action_type TEXT NOT NULL,
  action_detail JSONB,
  result TEXT NOT NULL DEFAULT 'applied',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS cats_pet_count_idx ON cats(pet_count DESC);
CREATE INDEX IF NOT EXISTS pets_cat_id_idx ON pets(cat_id);
CREATE INDEX IF NOT EXISTS world_log_created_at_idx ON world_log(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_log ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read cats and pets (public leaderboard)
CREATE POLICY "Cats are publicly readable" ON cats FOR SELECT USING (true);
CREATE POLICY "Pets are publicly readable" ON pets FOR SELECT USING (true);
CREATE POLICY "World log is publicly readable" ON world_log FOR SELECT USING (true);

-- Note: Writes go through the service role key (server-side only),
-- so we don't need public write policies.
