CREATE OR REPLACE FUNCTION public.is_class_participant(_class_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = _class_id AND (c.owner_id = _user_id OR c.head_teacher_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.class_members m
    WHERE m.class_id = _class_id AND m.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Allow all select" ON public.homeworks;
DROP POLICY IF EXISTS "Allow all insert" ON public.homeworks;
DROP POLICY IF EXISTS "Allow all update" ON public.homeworks;
DROP POLICY IF EXISTS "Allow all delete" ON public.homeworks;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homeworks TO authenticated;
GRANT ALL ON public.homeworks TO service_role;

CREATE POLICY "Homework visible to owner or class" ON public.homeworks
FOR SELECT TO authenticated
USING (
  creator_id = auth.uid()
  OR (class_id IS NOT NULL AND public.is_class_participant(class_id, auth.uid()))
  OR public.is_platform_staff(auth.uid())
);

CREATE POLICY "Users create own homework" ON public.homeworks
FOR INSERT TO authenticated
WITH CHECK (creator_id = auth.uid() OR public.is_platform_staff(auth.uid()));

CREATE POLICY "Owner or staff update homework" ON public.homeworks
FOR UPDATE TO authenticated
USING (creator_id = auth.uid() OR public.is_platform_staff(auth.uid()));

CREATE POLICY "Owner or staff delete homework" ON public.homeworks
FOR DELETE TO authenticated
USING (creator_id = auth.uid() OR public.is_platform_staff(auth.uid()));

CREATE TABLE public.homework_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (homework_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_completions TO authenticated;
GRANT ALL ON public.homework_completions TO service_role;

ALTER TABLE public.homework_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own completions" ON public.homework_completions
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_platform_staff(auth.uid()))
WITH CHECK (user_id = auth.uid());