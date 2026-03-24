-- ============================================
-- JobNexus — Supabase Database Schema
-- Using Firebase Auth (profiles.id = Firebase UID)
-- RLS disabled for hackathon
-- ============================================

-- Drop existing tables if re-running
DROP TABLE IF EXISTS saved_jobs CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS increment_application_count() CASCADE;
DROP FUNCTION IF EXISTS search_jobs(TEXT) CASCADE;

-- Table: profiles (id = Firebase UID, TEXT not UUID)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter')),
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  skills TEXT[],
  experience_years INTEGER,
  education TEXT,
  resume_url TEXT,
  resume_text TEXT,
  company_name TEXT,
  company_website TEXT,
  company_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  skills_required TEXT[] NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('full-time', 'part-time', 'contract', 'internship')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'INR',
  experience_min INTEGER DEFAULT 0,
  experience_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  application_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  resume_url TEXT,
  match_score REAL,
  match_reasoning TEXT,
  recruiter_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- Table: saved_jobs
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

-- Auto-increment application count
CREATE OR REPLACE FUNCTION increment_application_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE jobs SET application_count = application_count + 1
  WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_application_created
  AFTER INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION increment_application_count();

-- Full text search for jobs
CREATE OR REPLACE FUNCTION search_jobs(search_query TEXT)
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM jobs
  WHERE is_active = true
    AND (
      title ILIKE '%' || search_query || '%'
      OR description ILIKE '%' || search_query || '%'
      OR company_name ILIKE '%' || search_query || '%'
      OR search_query = ANY(skills_required)
    )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS DISABLED for hackathon (using Firebase Auth, not Supabase Auth)
-- App-level authorization checks are used instead

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;
