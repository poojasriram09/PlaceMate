-- Interview sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  overall_score INTEGER,
  grade TEXT,
  hire_recommendation TEXT,
  summary TEXT,
  scorecard JSONB,
  questions_answered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
