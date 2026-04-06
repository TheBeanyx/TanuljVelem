
CREATE TABLE public.read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel_type text NOT NULL,
  channel_id text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_type, channel_id)
);

ALTER TABLE public.read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status" ON public.read_status FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own read status" ON public.read_status FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own read status" ON public.read_status FOR UPDATE TO authenticated USING (user_id = auth.uid());
