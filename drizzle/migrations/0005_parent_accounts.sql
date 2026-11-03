CREATE TABLE public.parent_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  parent_email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.parent_link_codes TO authenticated;
GRANT ALL ON public.parent_link_codes TO service_role;
ALTER TABLE public.parent_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own parent codes" ON public.parent_link_codes FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students create own parent codes" ON public.parent_link_codes FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() AND used_at IS NULL AND used_by IS NULL);
CREATE POLICY "Students delete own parent codes" ON public.parent_link_codes FOR DELETE TO authenticated USING (student_id = auth.uid());

CREATE TABLE public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
GRANT SELECT, DELETE ON public.parent_links TO authenticated;
GRANT ALL ON public.parent_links TO service_role;
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linked parent or student can view link" ON public.parent_links FOR SELECT TO authenticated USING (parent_id = auth.uid() OR student_id = auth.uid());
CREATE POLICY "Linked parent or student can remove link" ON public.parent_links FOR DELETE TO authenticated USING (parent_id = auth.uid() OR student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_parent_of(_parent uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_links WHERE parent_id = _parent AND student_id = _student)
$$;

CREATE OR REPLACE FUNCTION public.parent_can_view_item(_creator uuid, _class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_links pl
    WHERE pl.parent_id = auth.uid()
      AND (pl.student_id = _creator OR (_class IS NOT NULL AND public.is_class_participant(_class, pl.student_id)))
  )
$$;

CREATE OR REPLACE FUNCTION public.redeem_parent_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.parent_link_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Bejelentkezés szükséges'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent') THEN
    RAISE EXCEPTION 'Csak szülői fiókkal lehet kódot beváltani';
  END IF;
  SELECT * INTO c FROM public.parent_link_codes WHERE code = upper(trim(_code)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Érvénytelen kód'; END IF;
  IF c.used_at IS NOT NULL THEN RAISE EXCEPTION 'Ezt a kódot már felhasználták'; END IF;
  IF c.expires_at < now() THEN RAISE EXCEPTION 'A kód lejárt'; END IF;
  IF c.student_id = auth.uid() THEN RAISE EXCEPTION 'Saját kódot nem lehet beváltani'; END IF;
  INSERT INTO public.parent_links (parent_id, student_id) VALUES (auth.uid(), c.student_id)
    ON CONFLICT (parent_id, student_id) DO NOTHING;
  UPDATE public.parent_link_codes SET used_at = now(), used_by = auth.uid() WHERE id = c.id;
  RETURN c.student_id;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_parent_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.redeem_parent_code(text) TO authenticated;

-- Parents can read what their linked child can read
CREATE POLICY "Parents view child homework" ON public.homeworks FOR SELECT TO authenticated USING (public.parent_can_view_item(creator_id, class_id));
CREATE POLICY "Parents view child exams" ON public.exams FOR SELECT TO authenticated USING (public.parent_can_view_item(creator_id, class_id));
CREATE POLICY "Parents view child test results" ON public.test_results FOR SELECT TO authenticated USING (public.is_parent_of(auth.uid(), user_id));
CREATE POLICY "Parents view child homework completions" ON public.homework_completions FOR SELECT TO authenticated USING (public.is_parent_of(auth.uid(), user_id));

-- Family chats: parent + one of the child's teachers (+ optionally the child)
CREATE TABLE public.family_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  include_student boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id, teacher_id, include_student)
);
GRANT SELECT, DELETE ON public.family_chats TO authenticated;
GRANT ALL ON public.family_chats TO service_role;
ALTER TABLE public.family_chats ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_family_chat_member(_chat uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_chats f
    WHERE f.id = _chat AND (f.parent_id = _user OR f.teacher_id = _user OR (f.include_student AND f.student_id = _user))
  )
$$;

CREATE POLICY "Members view family chats" ON public.family_chats FOR SELECT TO authenticated USING (public.is_family_chat_member(id, auth.uid()));
CREATE POLICY "Parent deletes family chat" ON public.family_chats FOR DELETE TO authenticated USING (parent_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(_teacher uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_members sm
    JOIN public.classes c ON c.id = sm.class_id
    WHERE sm.user_id = _student
      AND (
        c.owner_id = _teacher OR c.head_teacher_id = _teacher
        OR EXISTS (
          SELECT 1 FROM public.class_members tm JOIN public.profiles p ON p.id = tm.user_id
          WHERE tm.class_id = c.id AND tm.user_id = _teacher AND p.role = 'teacher'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.create_family_chat(_student uuid, _teacher uuid, _include_student boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing uuid;
BEGIN
  IF NOT public.is_parent_of(auth.uid(), _student) THEN RAISE EXCEPTION 'Nincs összekapcsolva ezzel a diákkal'; END IF;
  IF NOT public.is_teacher_of_student(_teacher, _student) THEN RAISE EXCEPTION 'Ez a felhasználó nem a gyermek tanára'; END IF;
  SELECT id INTO existing FROM public.family_chats
    WHERE parent_id = auth.uid() AND student_id = _student AND teacher_id = _teacher AND include_student = _include_student;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.family_chats (parent_id, student_id, teacher_id, include_student)
    VALUES (auth.uid(), _student, _teacher, _include_student) RETURNING id INTO existing;
  RETURN existing;
END;
$$;
REVOKE ALL ON FUNCTION public.create_family_chat(uuid, uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_family_chat(uuid, uuid, boolean) TO authenticated;

CREATE TABLE public.family_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.family_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX family_chat_messages_chat_idx ON public.family_chat_messages (chat_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.family_chat_messages TO authenticated;
GRANT ALL ON public.family_chat_messages TO service_role;
ALTER TABLE public.family_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read family messages" ON public.family_chat_messages FOR SELECT TO authenticated USING (public.is_family_chat_member(chat_id, auth.uid()));
CREATE POLICY "Members send family messages" ON public.family_chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_family_chat_member(chat_id, auth.uid()) AND length(text) BETWEEN 1 AND 4000);
CREATE POLICY "Senders delete own family messages" ON public.family_chat_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='family_chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.family_chat_messages;
  END IF;
END $$;