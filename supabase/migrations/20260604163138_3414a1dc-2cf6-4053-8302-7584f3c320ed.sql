
CREATE POLICY "Authenticated read study-materials"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'study-materials');

CREATE POLICY "Teachers upload to study-materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'study-materials'
    AND owner = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'teacher')
  );

CREATE POLICY "Owners delete from study-materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study-materials' AND owner = auth.uid());

CREATE POLICY "Owners update study-materials"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'study-materials' AND owner = auth.uid());
