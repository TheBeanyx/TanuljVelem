
-- Flashcard sets
CREATE TABLE public.flashcard_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  topic TEXT,
  class_id UUID,
  visibility TEXT NOT NULL DEFAULT 'private',
  length TEXT NOT NULL DEFAULT 'medium',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.flashcard_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.learn_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  topic TEXT,
  class_id UUID,
  visibility TEXT NOT NULL DEFAULT 'private',
  length TEXT NOT NULL DEFAULT 'medium',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_notes ENABLE ROW LEVEL SECURITY;

-- flashcard_sets policies
CREATE POLICY "View sets: public or owner or class member"
ON public.flashcard_sets FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR (class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.class_members cm WHERE cm.class_id = flashcard_sets.class_id AND cm.user_id = auth.uid()
  ))
  OR (class_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.classes c WHERE c.id = flashcard_sets.class_id AND c.owner_id = auth.uid()
  ))
);
CREATE POLICY "Insert own sets" ON public.flashcard_sets FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update own sets" ON public.flashcard_sets FOR UPDATE TO authenticated
USING (owner_id = auth.uid());
CREATE POLICY "Delete own sets" ON public.flashcard_sets FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- flashcard_items: visibility derived from parent set
CREATE POLICY "View items if can view set"
ON public.flashcard_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.flashcard_sets s WHERE s.id = flashcard_items.set_id
  AND (
    s.visibility = 'public'
    OR s.owner_id = auth.uid()
    OR (s.class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = s.class_id AND cm.user_id = auth.uid()))
    OR (s.class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = s.class_id AND c.owner_id = auth.uid()))
  )
));
CREATE POLICY "Insert items if owns set" ON public.flashcard_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.owner_id = auth.uid()));
CREATE POLICY "Update items if owns set" ON public.flashcard_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.owner_id = auth.uid()));
CREATE POLICY "Delete items if owns set" ON public.flashcard_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.flashcard_sets s WHERE s.id = set_id AND s.owner_id = auth.uid()));

-- learn_notes policies
CREATE POLICY "View notes: public or owner or class member"
ON public.learn_notes FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR owner_id = auth.uid()
  OR (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.class_members cm WHERE cm.class_id = learn_notes.class_id AND cm.user_id = auth.uid()))
  OR (class_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.classes c WHERE c.id = learn_notes.class_id AND c.owner_id = auth.uid()))
);
CREATE POLICY "Insert own notes" ON public.learn_notes FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update own notes" ON public.learn_notes FOR UPDATE TO authenticated
USING (owner_id = auth.uid());
CREATE POLICY "Delete own notes" ON public.learn_notes FOR DELETE TO authenticated
USING (owner_id = auth.uid());

CREATE TRIGGER trg_flashcard_sets_updated BEFORE UPDATE ON public.flashcard_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_learn_notes_updated BEFORE UPDATE ON public.learn_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_flashcard_items_set ON public.flashcard_items(set_id);
CREATE INDEX idx_flashcard_sets_owner ON public.flashcard_sets(owner_id);
CREATE INDEX idx_learn_notes_owner ON public.learn_notes(owner_id);
