
-- 1. app_role enum with 5 ranks
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('operator','moderator','staff','admin','superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role helper (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- staff-or-higher check (any of the 5 ranks == platform staff)
CREATE OR REPLACE FUNCTION public.is_platform_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

-- 4. RLS: users can see own roles, superadmin can see all
DROP POLICY IF EXISTS "users_see_own_roles" ON public.user_roles;
CREATE POLICY "users_see_own_roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "superadmin_manages_roles" ON public.user_roles;
CREATE POLICY "superadmin_manages_roles" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- 5. Auto-grant superadmin to bootstrap email
CREATE OR REPLACE FUNCTION public.bootstrap_superadmin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'thebeanyx11@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_bootstrap_super ON auth.users;
CREATE TRIGGER on_auth_user_bootstrap_super
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_superadmin();

-- 6. Seed existing superadmin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::public.app_role FROM auth.users
WHERE lower(email) = 'thebeanyx11@gmail.com'
ON CONFLICT DO NOTHING;

-- 7. Add is_system flag to direct_messages so admin-sent messages render as "TanuljVelem Admin"
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
