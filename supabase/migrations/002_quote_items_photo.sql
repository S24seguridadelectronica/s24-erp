-- ============================================================================
-- 002 — Evidencia fotográfica en los ítems de cotización
-- ============================================================================
-- Permite guardar la foto tomada desde la calculadora de servicios CCTV y
-- que el PDF de la cotización la imprima en una página de "Registro
-- fotográfico".
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- (o con `supabase db push` si usas la CLI).
--
-- Es idempotente: se puede ejecutar varias veces sin error.
-- ============================================================================

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS photo text;

COMMENT ON COLUMN public.quote_items.photo IS
  'Evidencia fotográfica en base64 (data:image/jpeg;base64,...). Se imprime en el PDF de la cotización.';

NOTIFY pgrst, 'reload schema';

-- Verificación rápida (opcional):
-- SELECT id, description, (photo IS NOT NULL) AS tiene_foto FROM public.quote_items ORDER BY id DESC LIMIT 10;
