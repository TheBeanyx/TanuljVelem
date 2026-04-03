
CREATE TABLE public.ai_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Egyéb',
  grade INTEGER NOT NULL DEFAULT 5,
  difficulty TEXT NOT NULL DEFAULT 'Közepes',
  html_code TEXT NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ai_games"
  ON public.ai_games FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own ai_games"
  ON public.ai_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own ai_games"
  ON public.ai_games FOR DELETE TO authenticated USING (auth.uid() = creator_id);
