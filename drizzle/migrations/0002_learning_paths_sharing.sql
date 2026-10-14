ALTER TABLE public.learning_paths ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.learning_paths ADD COLUMN plays INT NOT NULL DEFAULT 0;
CREATE POLICY "public paths select" ON public.learning_paths FOR SELECT TO authenticated USING (is_public = true);

CREATE TABLE public.learning_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  xp INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_path_progress TO authenticated;
GRANT ALL ON public.learning_path_progress TO service_role;
ALTER TABLE public.learning_path_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress all" ON public.learning_path_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_path_plays(_path_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.learning_paths SET plays = plays + 1 WHERE id = _path_id AND is_public = true AND user_id <> auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.bump_path_plays(uuid) TO authenticated;