
-- Classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 8,
  code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can insert classes" ON public.classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete classes" ON public.classes FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner can update classes" ON public.classes FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- Class members table
CREATE TABLE public.class_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, user_id)
);
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view class members" ON public.class_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join classes" ON public.class_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave classes" ON public.class_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Allow class owner to remove members
CREATE POLICY "Owner can remove members" ON public.class_members FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.classes WHERE classes.id = class_members.class_id AND classes.owner_id = auth.uid()));

-- Class messages table
CREATE TABLE public.class_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'chat',
  homework_id UUID REFERENCES public.homeworks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.class_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view class messages" ON public.class_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can insert messages" ON public.class_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add class_id to homeworks (optional link)
ALTER TABLE public.homeworks ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
-- Add creator_id to homeworks so we know who created it
ALTER TABLE public.homeworks ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
