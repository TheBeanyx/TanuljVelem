-- Principals: set only at sign-up (teacher + is_principal) or by service role
CREATE TABLE public.school_principals (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.school_principals TO authenticated;
GRANT ALL ON public.school_principals TO service_role;
ALTER TABLE public.school_principals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own principal status" ON public.school_principals FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  IF COALESCE(NEW.raw_user_meta_data->>'role', '') = 'teacher'
     AND COALESCE(NEW.raw_user_meta_data->>'is_principal', 'false') = 'true' THEN
    INSERT INTO public.school_principals (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_principal(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_principals sp JOIN public.profiles p ON p.id = sp.user_id
    WHERE sp.user_id = _user AND NOT COALESCE(p.suspended, false)
  )
$$;

CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  city text,
  principal_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

CREATE TABLE public.school_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  member_role text NOT NULL CHECK (member_role IN ('principal','teacher','student','parent')),
  added_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);
CREATE INDEX school_members_user_idx ON public.school_members (user_id);
GRANT SELECT, DELETE ON public.school_members TO authenticated;
GRANT ALL ON public.school_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_school_member(_school uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.school_members WHERE school_id = _school AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.is_school_principal(_school uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.schools WHERE id = _school AND principal_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.can_post_school_announcement(_school uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_members
    WHERE school_id = _school AND user_id = _user AND member_role IN ('principal','teacher')
  )
$$;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view school" ON public.schools FOR SELECT TO authenticated
  USING (principal_id = auth.uid() OR public.is_school_member(id, auth.uid()));
CREATE POLICY "Principals create schools" ON public.schools FOR INSERT TO authenticated
  WITH CHECK (principal_id = auth.uid() AND public.is_principal(auth.uid()));
CREATE POLICY "Principal updates school" ON public.schools FOR UPDATE TO authenticated
  USING (principal_id = auth.uid()) WITH CHECK (principal_id = auth.uid());
CREATE POLICY "Principal deletes school" ON public.schools FOR DELETE TO authenticated
  USING (principal_id = auth.uid());

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.add_principal_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.school_members (school_id, user_id, member_role, added_by)
  VALUES (NEW.id, NEW.principal_id, 'principal', NEW.principal_id)
  ON CONFLICT (school_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER add_principal_as_member AFTER INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.add_principal_as_member();

ALTER TABLE public.school_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view school members" ON public.school_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_school_member(school_id, auth.uid()));
CREATE POLICY "Principal removes or member leaves" ON public.school_members FOR DELETE TO authenticated
  USING (
    (public.is_school_principal(school_id, auth.uid()) AND user_id <> auth.uid())
    OR (user_id = auth.uid() AND member_role <> 'principal')
  );

-- Students hand a one-time code to the principal
CREATE TABLE public.school_join_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_for_school uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.school_join_codes TO authenticated;
GRANT ALL ON public.school_join_codes TO service_role;
ALTER TABLE public.school_join_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own school codes" ON public.school_join_codes FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students create own school codes" ON public.school_join_codes FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND used_at IS NULL AND used_for_school IS NULL);
CREATE POLICY "Students delete own school codes" ON public.school_join_codes FOR DELETE TO authenticated USING (student_id = auth.uid());

CREATE OR REPLACE FUNCTION public.add_school_member(_school uuid, _username text, _code text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.profiles%ROWTYPE;
  r text;
  c public.school_join_codes%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Bejelentkezés szükséges'; END IF;
  IF NOT public.is_school_principal(_school, auth.uid()) OR NOT public.is_principal(auth.uid()) THEN
    RAISE EXCEPTION 'Csak az iskola igazgatója adhat hozzá tagokat';
  END IF;
  SELECT * INTO target FROM public.profiles WHERE username = trim(_username);
  IF NOT FOUND THEN
    SELECT * INTO target FROM public.profiles WHERE lower(username) = lower(trim(_username)) LIMIT 1;
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nincs ilyen felhasználónév'; END IF;
  IF target.id = auth.uid() THEN RAISE EXCEPTION 'Te már tagja vagy az iskolának'; END IF;
  IF public.is_school_member(_school, target.id) THEN RAISE EXCEPTION 'Ez a felhasználó már az iskola tagja'; END IF;

  IF EXISTS (SELECT 1 FROM public.teacher_site_authors WHERE user_id = target.id) THEN
    r := 'teacher';
  ELSIF target.role = 'parent' THEN
    r := 'parent';
  ELSE
    r := 'student';
    IF _code IS NULL OR length(trim(_code)) = 0 THEN
      RAISE EXCEPTION 'Diák hozzáadásához kell a diák iskolai kódja';
    END IF;
    SELECT * INTO c FROM public.school_join_codes
      WHERE student_id = target.id AND code = upper(trim(_code)) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A kód nem ehhez a diákhoz tartozik vagy hibás'; END IF;
    IF c.used_at IS NOT NULL THEN RAISE EXCEPTION 'Ezt a kódot már felhasználták'; END IF;
    IF c.expires_at < now() THEN RAISE EXCEPTION 'A kód lejárt'; END IF;
    UPDATE public.school_join_codes SET used_at = now(), used_for_school = _school WHERE id = c.id;
  END IF;

  INSERT INTO public.school_members (school_id, user_id, member_role, added_by)
  VALUES (_school, target.id, r, auth.uid());
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.add_school_member(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_school_member(uuid, text, text) TO authenticated;

-- School-only announcement wall
CREATE TABLE public.school_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text,
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 8000),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX school_announcements_school_idx ON public.school_announcements (school_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.school_announcements TO authenticated;
GRANT ALL ON public.school_announcements TO service_role;
ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read school wall" ON public.school_announcements FOR SELECT TO authenticated
  USING (public.is_school_member(school_id, auth.uid()));
CREATE POLICY "Staff post on school wall" ON public.school_announcements FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_post_school_announcement(school_id, auth.uid()));
CREATE POLICY "Author or principal deletes post" ON public.school_announcements FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_school_principal(school_id, auth.uid()));