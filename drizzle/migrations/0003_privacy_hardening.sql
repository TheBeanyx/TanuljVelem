-- Exams: only creator or the shared class can see them
DROP POLICY IF EXISTS "Authenticated users can view exams" ON public.exams;
DROP POLICY IF EXISTS "Admins can manage all exams" ON public.exams;
CREATE POLICY "View own or class exams" ON public.exams FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR (class_id IS NOT NULL AND public.is_class_participant(class_id, auth.uid())));
CREATE POLICY "Staff can delete exams" ON public.exams FOR DELETE TO authenticated
  USING (public.is_platform_staff(auth.uid()));

-- Homework completions: only own
DROP POLICY IF EXISTS "Users manage own completions" ON public.homework_completions;
CREATE POLICY "Users manage own completions" ON public.homework_completions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Test results: owned by the person who wrote the test
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
DROP POLICY IF EXISTS "Allow all select results" ON public.test_results;
DROP POLICY IF EXISTS "Allow all insert results" ON public.test_results;
CREATE POLICY "View own results" ON public.test_results FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own results" ON public.test_results FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Learning path progress: move owner progress into the private progress table
INSERT INTO public.learning_path_progress (user_id, path_id, completed, xp)
  SELECT user_id, id, completed, xp FROM public.learning_paths
  WHERE jsonb_array_length(completed) > 0 OR xp > 0
  ON CONFLICT (user_id, path_id) DO NOTHING;
UPDATE public.learning_paths SET completed = '[]'::jsonb, xp = 0 WHERE jsonb_array_length(completed) > 0 OR xp > 0;
COMMENT ON COLUMN public.learning_paths.completed IS 'DEPRECATED: progress lives in learning_path_progress';
COMMENT ON COLUMN public.learning_paths.xp IS 'DEPRECATED: progress lives in learning_path_progress';