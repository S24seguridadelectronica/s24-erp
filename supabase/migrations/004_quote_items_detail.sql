-- ============================================================================
-- 004 — Desglose estructurado de los ítems de cotización
-- ============================================================================
-- Guarda el cálculo completo de la calculadora de servicios (categoría, topes
-- aplicados, metros extra, dificultades) para auditoría y recalculo.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- Es idempotente.
-- ============================================================================

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS detail jsonb;

COMMENT ON COLUMN public.quote_items.detail IS
  'Desglose estructurado del cálculo (categoria, topes, metros, dificultades) generado por la calculadora de servicios.';

NOTIFY pgrst, 'reload schema';
