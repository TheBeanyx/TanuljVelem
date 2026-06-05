
-- 1) is_warning on direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_warning boolean NOT NULL DEFAULT false;

-- 2) admin email helper
CREATE OR REPLACE FUNCTION public.is_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) = 'thebeanyx11@gmail.com';
$$;

-- 3) rules table
CREATE TABLE IF NOT EXISTS public.rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rules TO authenticated;
GRANT ALL ON public.rules TO service_role;

ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rules" ON public.rules FOR SELECT USING (true);
CREATE POLICY "Admin can insert rules" ON public.rules FOR INSERT TO authenticated WITH CHECK (public.is_admin_email());
CREATE POLICY "Admin can update rules" ON public.rules FOR UPDATE TO authenticated USING (public.is_admin_email()) WITH CHECK (public.is_admin_email());
CREATE POLICY "Admin can delete rules" ON public.rules FOR DELETE TO authenticated USING (public.is_admin_email());

CREATE TRIGGER update_rules_updated_at BEFORE UPDATE ON public.rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Admin can update any profile
CREATE POLICY "Admin can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin_email()) WITH CHECK (public.is_admin_email());

-- 5) Seed default rules
INSERT INTO public.rules (title, body, sort_order) VALUES
  ('Légy tisztelettudó', 'Bánj mindenkivel udvariasan. Tilos a sértegetés, gyűlöletbeszéd és bármilyen zaklatás.', 1),
  ('Tartsd be a tantermi etikettet', 'A közleményeknél és osztály chatben maradj a témánál és segítsd a többieket.', 2),
  ('Ne csalj', 'A teszteket és kihívásokat önállóan oldd meg. A csalás pontlevonással és felfüggesztéssel járhat.', 3),
  ('Védd a személyes adataid', 'Ne osszál meg jelszót, telefonszámot vagy lakcímet az oldalon.', 4),
  ('Jelents minden problémát', 'Ha hibát vagy visszaélést tapasztalsz, használd a Javaslatok fület vagy írj a Kapcsolat AI-nak.', 5);
