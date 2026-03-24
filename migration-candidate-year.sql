-- Add candidate_year column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS candidate_year INTEGER;

-- Valid values: 1, 2, 3, 4 (year of college)
-- 2nd/3rd year students see only internships
-- 4th year students see internships + full-time jobs
