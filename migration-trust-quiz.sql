-- ============================================
-- TalentBridge AI — Trust & Quiz Migration
-- Run in Supabase SQL Editor
-- ============================================

-- Add trust fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score REAL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_flags TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills_verified TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quiz_scores JSONB DEFAULT '{}';

-- Skill quiz results table
CREATE TABLE IF NOT EXISTS skill_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB,
  score INTEGER,
  total INTEGER,
  passed BOOLEAN,
  integrity_score REAL,
  integrity_flags JSONB DEFAULT '[]',
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add trust_score to applications so recruiters see it
ALTER TABLE applications ADD COLUMN IF NOT EXISTS trust_score REAL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS trust_flags TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS skills_quiz_summary JSONB;
