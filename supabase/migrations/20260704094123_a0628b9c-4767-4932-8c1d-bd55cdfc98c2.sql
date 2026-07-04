
-- direct_messages új mezők
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS is_suggestion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_delta integer,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- profiles: suspended
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- user_roles: superadmin manages, staff reads
DROP POLICY IF EXISTS "Superadmin manages roles" ON public.user_roles;
CREATE POLICY "Superadmin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Staff can read roles" ON public.user_roles;
CREATE POLICY "Staff can read roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()) OR user_id = auth.uid());

-- profiles: staff can update suspended/role
DROP POLICY IF EXISTS "Staff can update any profile" ON public.profiles;
CREATE POLICY "Staff can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));
