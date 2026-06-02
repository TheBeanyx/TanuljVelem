ALTER TABLE public.challenge_daily_tasks
  ADD COLUMN IF NOT EXISTS subtasks JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.challenge_daily_tasks.subtasks IS
  'Array of mini creative tasks for the day: [{id, title, task_type, prompt_markdown, max_points, est_minutes, submission, awarded_points, feedback, completed_at}]';