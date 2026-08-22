
CREATE POLICY "item images select own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "item images insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "item images update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "item images delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
