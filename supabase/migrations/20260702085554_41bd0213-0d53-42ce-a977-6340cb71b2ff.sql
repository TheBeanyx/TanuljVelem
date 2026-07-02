
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sg select all authed" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "sg insert own" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "sg update own or admin" ON public.study_groups FOR UPDATE TO authenticated USING (auth.uid() = owner_id OR public.is_admin_email()) WITH CHECK (auth.uid() = owner_id OR public.is_admin_email());
CREATE POLICY "sg delete own or admin" ON public.study_groups FOR DELETE TO authenticated USING (auth.uid() = owner_id OR public.is_admin_email());
CREATE TRIGGER trg_sg_updated BEFORE UPDATE ON public.study_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sgm select all authed" ON public.study_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "sgm join self" ON public.study_group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sgm leave self or owner or admin" ON public.study_group_members FOR DELETE TO authenticated USING (
  auth.uid() = user_id
  OR public.is_admin_email()
  OR EXISTS (SELECT 1 FROM public.study_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
);

CREATE TABLE public.study_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_messages TO authenticated;
GRANT ALL ON public.study_group_messages TO service_role;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sgmsg select members" ON public.study_group_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_messages.group_id AND m.user_id = auth.uid())
  OR public.is_admin_email()
);
CREATE POLICY "sgmsg insert members" ON public.study_group_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_messages.group_id AND m.user_id = auth.uid())
);
CREATE POLICY "sgmsg delete own or admin" ON public.study_group_messages FOR DELETE TO authenticated USING (auth.uid() = sender_id OR public.is_admin_email());
