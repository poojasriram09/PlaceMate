-- ============================================
-- TalentBridge AI — Migration Script
-- Run this in Supabase SQL Editor
-- Adds: TPO role, recruiter verification, trust layer
-- ============================================

-- 1. Update profiles: allow 'tpo' role, add verification fields
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('candidate', 'recruiter', 'tpo'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_description TEXT;

-- 2. Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_website TEXT,
  company_email TEXT,
  company_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  reviewed_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(recruiter_id, status)
);

-- 3. Set existing recruiters as verified (so they keep working)
UPDATE profiles SET verification_status = 'verified' WHERE role = 'recruiter' AND verification_status = 'unverified';

-- 4. Set existing candidates as verified
UPDATE profiles SET verification_status = 'verified' WHERE role = 'candidate';
