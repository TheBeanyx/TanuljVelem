CREATE TABLE public.learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  grade INT,
  units JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  xp INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own paths select" ON public.learning_paths FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own paths insert" ON public.learning_paths FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own paths update" ON public.learning_paths FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own paths delete" ON public.learning_paths FOR DELETE TO authenticated USING (auth.uid() = user_id);