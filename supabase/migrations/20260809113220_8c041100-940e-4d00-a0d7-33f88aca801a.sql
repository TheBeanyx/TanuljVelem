CREATE TABLE public.admin_awarded_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  subject text,
  points integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_awarded_challenges TO authenticated;
GRANT ALL ON public.admin_awarded_challenges TO service_role;

ALTER TABLE public.admin_awarded_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view their awarded challenges"
ON public.admin_awarded_challenges FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all awarded challenges"
ON public.admin_awarded_challenges FOR SELECT TO authenticated
USING (public.is_platform_staff(auth.uid()) OR public.is_admin_email());

CREATE POLICY "Staff can create awarded challenges"
ON public.admin_awarded_challenges FOR INSERT TO authenticated
WITH CHECK ((public.is_platform_staff(auth.uid()) OR public.is_admin_email()) AND auth.uid() = admin_id);

CREATE POLICY "Staff can update awarded challenges"
ON public.admin_awarded_challenges FOR UPDATE TO authenticated
USING (public.is_platform_staff(auth.uid()) OR public.is_admin_email());

CREATE POLICY "Recipients can respond to their awarded challenges"
ON public.admin_awarded_challenges FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can delete awarded challenges"
ON public.admin_awarded_challenges FOR DELETE TO authenticated
USING (public.is_platform_staff(auth.uid()) OR public.is_admin_email());

CREATE INDEX idx_admin_awarded_challenges_user ON public.admin_awarded_challenges (user_id, status);

CREATE TRIGGER update_admin_awarded_challenges_updated_at
BEFORE UPDATE ON public.admin_awarded_challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();