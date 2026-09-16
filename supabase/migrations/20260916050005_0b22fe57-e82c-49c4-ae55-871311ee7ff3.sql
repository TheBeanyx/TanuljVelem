CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  topic TEXT,
  exam_type TEXT NOT NULL DEFAULT 'Felmérő',
  exam_date DATE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exams"
ON public.exams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create exams"
ON public.exams FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their exams"
ON public.exams FOR UPDATE TO authenticated USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their exams"
ON public.exams FOR DELETE TO authenticated USING (creator_id = auth.uid());

CREATE POLICY "Admins can manage all exams"
ON public.exams FOR ALL TO authenticated USING (public.is_platform_staff(auth.uid())) WITH CHECK (public.is_platform_staff(auth.uid()));

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();