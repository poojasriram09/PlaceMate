-- Add target_years column to jobs table (which year students this job targets)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS target_years INTEGER[] DEFAULT '{}';

-- Example: target_years = {2, 3} means 2nd and 3rd year students can see this job
-- Empty array = visible to all years
