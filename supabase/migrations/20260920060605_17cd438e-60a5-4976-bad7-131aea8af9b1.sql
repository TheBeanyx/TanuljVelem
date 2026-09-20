DROP POLICY "Homework visible to owner or class" ON public.homeworks;

CREATE POLICY "Homework visible to owner or class"
ON public.homeworks
FOR SELECT
TO authenticated
USING (
  creator_id = auth.uid()
  OR (class_id IS NOT NULL AND is_class_participant(class_id, auth.uid()))
);