
CREATE TABLE public.study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade INTEGER,
  type TEXT NOT NULL DEFAULT 'file',
  url TEXT,
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size BIGINT,
  visibility TEXT NOT NULL DEFAULT 'public',
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_materials TO authenticated;
GRANT ALL ON public.study_materials TO service_role;

ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View materials: public or owner or class member"
  ON public.study_materials FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = study_materials.class_id AND cm.user_id = auth.uid()
    ))
    OR (class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.id = study_materials.class_id AND c.owner_id = auth.uid()
    ))
  );

CREATE POLICY "Teachers can insert materials"
  ON public.study_materials FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

CREATE POLICY "Owners can update their materials"
  ON public.study_materials FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their materials"
  ON public.study_materials FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

CREATE TRIGGER trg_study_materials_updated
  BEFORE UPDATE ON public.study_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_study_materials_owner ON public.study_materials(owner_id);
CREATE INDEX idx_study_materials_class ON public.study_materials(class_id);

-- Lesson note linking: connect a note to a lesson/material via reference fields
ALTER TABLE public.learn_notes
  ADD COLUMN IF NOT EXISTS lesson_ref_type TEXT,
  ADD COLUMN IF NOT EXISTS lesson_ref_id UUID,
  ADD COLUMN IF NOT EXISTS lesson_ref_title TEXT;
