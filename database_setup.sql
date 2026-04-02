-- =====================================================
-- AGRI VOICE 360 — SUPABASE DATABASE SETUP
-- Run this SQL in your Supabase SQL Editor:
-- https://supabase.com/dashboard → your project → SQL Editor
-- =====================================================

-- 1. Create the submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  state           TEXT,
  district        TEXT,
  is_farmer       BOOLEAN DEFAULT TRUE,
  role            TEXT DEFAULT 'farmer',
  crop_type       TEXT,
  farm_size       TEXT,
  problem_category TEXT,
  problem_detail  TEXT,
  suggested_solution TEXT,
  extra_comments  TEXT,
  language        TEXT DEFAULT 'en'
);

-- 2. Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 3. Allow anyone to INSERT (public form submission)
CREATE POLICY "Allow public insert"
  ON public.submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 4. Allow authenticated users (admin) to SELECT all
CREATE POLICY "Allow admin select"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Allow public to read (for community voices)
CREATE POLICY "Allow public select"
  ON public.submissions
  FOR SELECT
  TO anon
  USING (true);

-- 6. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON public.submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_state ON public.submissions(state);
CREATE INDEX IF NOT EXISTS idx_submissions_category ON public.submissions(problem_category);

-- =====================================================
-- DONE! Now update supabase-config.js with your
-- project URL and anon key from:
-- Settings → API → Project API keys
-- =====================================================
