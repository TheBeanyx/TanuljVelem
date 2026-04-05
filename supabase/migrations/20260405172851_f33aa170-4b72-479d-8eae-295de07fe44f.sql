
-- Add head_teacher_id to classes
ALTER TABLE public.classes ADD COLUMN head_teacher_id uuid DEFAULT NULL;

-- Create mentions table for notifications
CREATE TABLE public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  message_id uuid NOT NULL,
  mentioned_user_id uuid NOT NULL,
  mentioner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their mentions" ON public.mentions FOR SELECT TO authenticated USING (mentioned_user_id = auth.uid() OR mentioner_user_id = auth.uid());
CREATE POLICY "Authenticated can insert mentions" ON public.mentions FOR INSERT TO authenticated WITH CHECK (mentioner_user_id = auth.uid());
