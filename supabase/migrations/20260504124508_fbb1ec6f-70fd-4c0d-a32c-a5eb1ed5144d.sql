-- Add grade column to flashcard_sets and learn_notes
ALTER TABLE public.flashcard_sets ADD COLUMN IF NOT EXISTS grade integer;
ALTER TABLE public.learn_notes ADD COLUMN IF NOT EXISTS grade integer;

-- Make class_id optional/unused going forward (already nullable, leave as is for back-compat)
-- Update RLS to keep working: existing policies already handle class_id IS NOT NULL, so no change needed.