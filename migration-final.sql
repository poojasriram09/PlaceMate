-- ============================================
-- TalentBridge AI — Final Migration
-- Run this in Supabase SQL Editor to ensure
-- ALL features work end-to-end
-- ============================================

-- 1. Profile fields for TPO verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_description TEXT;

-- 2. Skill verification fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills_verified TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quiz_scores JSONB DEFAULT '{}';

-- 3. Trust score fields (used by resume analysis)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score REAL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_flags TEXT[] DEFAULT '{}';

-- 4. Allow TPO role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('candidate', 'recruiter', 'tpo'));

-- 5. Skill quizzes table
CREATE TABLE IF NOT EXISTS skill_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  questions JSONB,
  answers JSONB,
  score INTEGER,
  total INTEGER,
  passed BOOLEAN,
  integrity_score REAL,
  integrity_flags JSONB DEFAULT '[]',
  time_taken_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Verification requests table (for TPO flow)
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_email TEXT,
  company_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 7. Application trust fields
ALTER TABLE applications ADD COLUMN IF NOT EXISTS trust_score REAL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS trust_flags TEXT[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS skills_quiz_summary JSONB;

-- 8. Ensure existing users work
UPDATE profiles SET verification_status = 'verified' WHERE verification_status IS NULL;
