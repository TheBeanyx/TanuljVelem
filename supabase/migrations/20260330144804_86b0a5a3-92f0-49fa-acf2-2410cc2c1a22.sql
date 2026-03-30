
-- Create homeworks table
CREATE TABLE public.homeworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (no auth yet)
CREATE POLICY "Allow all select" ON public.homeworks FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON public.homeworks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON public.homeworks FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON public.homeworks FOR DELETE USING (true);

-- Create user_settings table for preferences like auto-delete expired homework
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT 'false',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select settings" ON public.user_settings FOR SELECT USING (true);
CREATE POLICY "Allow all insert settings" ON public.user_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update settings" ON public.user_settings FOR UPDATE USING (true);

-- Insert default setting for auto-delete expired homework
INSERT INTO public.user_settings (setting_key, setting_value) VALUES ('auto_delete_expired_homework', 'false');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_homeworks_updated_at
  BEFORE UPDATE ON public.homeworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
