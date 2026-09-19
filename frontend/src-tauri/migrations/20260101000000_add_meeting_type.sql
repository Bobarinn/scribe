-- Add meeting_type column to meetings for categorization / grouping / filtering.
-- This is a free-form category label (maps to a template id) used purely to group
-- and filter meetings in the UI. It does not change summary formatting.
ALTER TABLE meetings ADD COLUMN meeting_type TEXT;
