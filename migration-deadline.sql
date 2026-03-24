-- Add deadline column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline DATE;
