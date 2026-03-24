-- Save resume builder form data for editing later
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_data JSONB;
