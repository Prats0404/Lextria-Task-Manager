-- Add completed_date and is_archived columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_date text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create an index to optimize filtering by archived status and completion date
CREATE INDEX IF NOT EXISTS idx_tasks_is_archived ON tasks(is_archived);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(completed_date);
