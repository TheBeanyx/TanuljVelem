
CREATE TABLE public.challenge_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 8,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_subscriptions TO authenticated;
GRANT ALL ON public.challenge_subscriptions TO service_role;

ALTER TABLE public.challenge_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own subscriptions" ON public.challenge_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own subscriptions" ON public.challenge_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own subscriptions" ON public.challenge_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Delete own subscriptions" ON public.challenge_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.challenge_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.challenge_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_id UUID,
  score INTEGER,
  total_questions INTEGER,
  percentage NUMERIC,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, task_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_daily_tasks TO authenticated;
GRANT ALL ON public.challenge_daily_tasks TO service_role;

ALTER TABLE public.challenge_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own tasks" ON public.challenge_daily_tasks FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own tasks" ON public.challenge_daily_tasks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own tasks" ON public.challenge_daily_tasks FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_challenge_subs_user ON public.challenge_subscriptions(user_id);
CREATE INDEX idx_challenge_tasks_sub ON public.challenge_daily_tasks(subscription_id);
