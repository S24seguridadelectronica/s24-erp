-- ============================================================================
-- 005 — Evidencias fotográficas en Supabase Storage
-- ============================================================================
-- Las fotos dejan de guardarse en base64 dentro de las tablas: se suben al
-- bucket público `evidencias` y en la base solo queda la ruta.
--
-- Ejecutar en Supabase Dashboard → SQL Editor → Run.
-- Es idempotente.
-- ============================================================================

-- 1) Bucket (lectura pública, escritura solo autenticados)
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias', 'evidencias', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Políticas de escritura sobre los objetos del bucket
DROP POLICY IF EXISTS "evidencias_insert" ON storage.objects;
CREATE POLICY "evidencias_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "evidencias_update" ON storage.objects;
CREATE POLICY "evidencias_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'evidencias')
  WITH CHECK (bucket_id = 'evidencias');

DROP POLICY IF EXISTS "evidencias_delete" ON storage.objects;
CREATE POLICY "evidencias_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evidencias');

-- 3) Rutas en las tablas
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS photos jsonb;

COMMENT ON COLUMN public.quote_items.photos IS
  'Rutas de las fotos en Storage (bucket evidencias). photo queda solo para registros antiguos en base64.';

ALTER TABLE public.work_order_photos
  ADD COLUMN IF NOT EXISTS storage_path text;

COMMENT ON COLUMN public.work_order_photos.storage_path IS
  'Ruta en Storage; la columna photo queda solo para registros antiguos.';

NOTIFY pgrst, 'reload schema';

-- Verificación (opcional):
-- SELECT id, public FROM storage.buckets WHERE id = 'evidencias';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'quote_items' AND column_name = 'photos';
