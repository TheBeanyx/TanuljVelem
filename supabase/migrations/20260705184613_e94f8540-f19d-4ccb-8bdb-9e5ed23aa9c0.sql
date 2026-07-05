
-- AI Tutor chat history with threads and folders
CREATE TABLE public.ai_chat_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_folders TO authenticated;
GRANT ALL ON public.ai_chat_folders TO service_role;
ALTER TABLE public.ai_chat_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own folders" ON public.ai_chat_folders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.ai_chat_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Új beszélgetés',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_threads TO authenticated;
GRANT ALL ON public.ai_chat_threads TO service_role;
ALTER TABLE public.ai_chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.ai_chat_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.ai_chat_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_messages TO authenticated;
GRANT ALL ON public.ai_chat_messages TO service_role;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thread msgs" ON public.ai_chat_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE INDEX ai_chat_threads_user_idx ON public.ai_chat_threads(user_id, updated_at DESC);
CREATE INDEX ai_chat_messages_thread_idx ON public.ai_chat_messages(thread_id, created_at);
