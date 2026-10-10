CREATE TABLE public.teacher_site_authors (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE);
GRANT SELECT ON public.teacher_site_authors TO authenticated;
GRANT ALL ON public.teacher_site_authors TO service_role;
ALTER TABLE public.teacher_site_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own author eligibility" ON public.teacher_site_authors FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.teacher_site_authors(user_id) SELECT id FROM public.profiles WHERE role = 'teacher' ON CONFLICT DO NOTHING;
CREATE FUNCTION public.sync_teacher_site_author() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF TG_OP = 'INSERT' THEN
 IF NEW.role = 'teacher' THEN INSERT INTO public.teacher_site_authors(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; END IF;
ELSIF NEW.role IS DISTINCT FROM OLD.role AND (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'superadmin')) THEN
 IF NEW.role = 'teacher' THEN INSERT INTO public.teacher_site_authors(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; ELSE DELETE FROM public.teacher_site_authors WHERE user_id = NEW.id; END IF;
END IF;
RETURN NEW; END $$;
CREATE TRIGGER sync_teacher_site_author AFTER INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_teacher_site_author();
CREATE FUNCTION public.can_author_teacher_site() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.teacher_site_authors a JOIN public.profiles p ON p.id = a.user_id WHERE a.user_id = auth.uid() AND NOT COALESCE(p.suspended, false)); $$;
REVOKE ALL ON FUNCTION public.can_author_teacher_site() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_author_teacher_site() TO authenticated;
CREATE TABLE public.teacher_websites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT '', slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 80),
 editor_mode text NOT NULL DEFAULT 'visual' CHECK (editor_mode IN ('visual','html')), html text NOT NULL DEFAULT '', blocks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(blocks) = 'array'),
 updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_websites TO authenticated;
GRANT ALL ON public.teacher_websites TO service_role;
ALTER TABLE public.teacher_websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authors read own drafts" ON public.teacher_websites FOR SELECT TO authenticated USING (owner_id = auth.uid() AND public.can_author_teacher_site());
CREATE POLICY "Authors create own drafts" ON public.teacher_websites FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.can_author_teacher_site());
CREATE POLICY "Authors update own drafts" ON public.teacher_websites FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND public.can_author_teacher_site()) WITH CHECK (owner_id = auth.uid() AND public.can_author_teacher_site());
CREATE POLICY "Authors delete own drafts" ON public.teacher_websites FOR DELETE TO authenticated USING (owner_id = auth.uid() AND public.can_author_teacher_site());
CREATE TABLE public.published_teacher_websites (
 id uuid PRIMARY KEY REFERENCES public.teacher_websites(id) ON DELETE CASCADE, owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 title text NOT NULL, slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 1 AND 80), html text NOT NULL, published_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.published_teacher_websites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.published_teacher_websites TO authenticated;
GRANT ALL ON public.published_teacher_websites TO service_role;
ALTER TABLE public.published_teacher_websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published pages are public" ON public.published_teacher_websites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authors publish own pages" ON public.published_teacher_websites FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.can_author_teacher_site() AND EXISTS (SELECT 1 FROM public.teacher_websites w WHERE w.id = published_teacher_websites.id AND w.owner_id = auth.uid()));
CREATE POLICY "Authors update own published pages" ON public.published_teacher_websites FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND public.can_author_teacher_site()) WITH CHECK (owner_id = auth.uid() AND public.can_author_teacher_site() AND EXISTS (SELECT 1 FROM public.teacher_websites w WHERE w.id = published_teacher_websites.id AND w.owner_id = auth.uid()));
CREATE POLICY "Authors unpublish own pages" ON public.published_teacher_websites FOR DELETE TO authenticated USING (owner_id = auth.uid() AND public.can_author_teacher_site());