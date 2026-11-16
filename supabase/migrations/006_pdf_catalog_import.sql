-- =====================================================================
-- Migración 006: Importación inteligente de catálogos PDF
-- Módulo: Importación Masiva de Productos (ERP S24)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columnas nuevas en la tabla central `products` (NO se crea catálogo
--    paralelo: los productos extraídos del PDF viven en `products`)
-- ---------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'COP',
  ADD COLUMN IF NOT EXISTS previous_price DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS warranty_text TEXT,
  ADD COLUMN IF NOT EXISTS characteristics JSONB,
  ADD COLUMN IF NOT EXISTS source_pdf TEXT,
  ADD COLUMN IF NOT EXISTS source_page INTEGER,
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending'
    CHECK (review_status IN ('pending','in_review','approved','published','inactive'));

COMMENT ON COLUMN public.products.review_status IS
  'Estado de validación de productos importados: pending|in_review|approved|published|inactive.';

COMMENT ON COLUMN public.products.currency IS
  'Moneda del precio detectado en el catálogo del proveedor (COP, USD...).';

COMMENT ON COLUMN public.products.characteristics IS
  'Especificaciones técnicas extraídas del catálogo [{nombre, valor}].';

-- Índices de búsqueda del catálogo central
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_review_status ON public.products(review_status);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm_search ON public.products (lower(name));

-- ---------------------------------------------------------------------
-- 2) Tabla: pdf_import_batches (historial de importaciones PDF)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdf_import_batches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  total_pages INTEGER,
  supplier_name TEXT,
  supplier_id BIGINT REFERENCES public.suppliers(id),
  default_brand TEXT,
  default_category TEXT,
  price_list_type TEXT,
  duplicate_strategy TEXT DEFAULT 'skip' CHECK (duplicate_strategy IN ('skip','update','pending')),
  doc_type TEXT CHECK (doc_type IN ('digital','scanned','mixed','unknown')),
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','completed','completed_with_errors','failed')),
  totals JSONB,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdf_import_batches_user ON public.pdf_import_batches(user_id);

-- ---------------------------------------------------------------------
-- 3) Tabla: pdf_import_items (resultados por producto, con duplicados)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdf_import_items (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES public.pdf_import_batches(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  existing_product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT,
  name TEXT,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  model TEXT,
  description TEXT,
  characteristics JSONB,
  price DECIMAL(15,2),
  previous_price DECIMAL(15,2),
  currency TEXT,
  warranty_text TEXT,
  supplier_name TEXT,
  image_path TEXT,
  image_url TEXT,
  source_page INTEGER,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','in_review','approved','published','inactive')),
  match_status TEXT DEFAULT 'new' CHECK (match_status IN ('new','existing','updated','pending')),
  validation_notes JSONB,
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdf_import_items_batch ON public.pdf_import_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_pdf_import_items_sku ON public.pdf_import_items(sku);

-- ---------------------------------------------------------------------
-- 4) Tabla: product_images (relación producto ↔ imágenes de Storage)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  batch_id BIGINT REFERENCES public.pdf_import_batches(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'product-images',
  mime_type TEXT,
  size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  source_pdf TEXT,
  source_page INTEGER,
  content_hash TEXT,
  is_primary BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);

-- ---------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.pdf_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view import batches"
  ON public.pdf_import_batches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create import batches"
  ON public.pdf_import_batches FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own import batches"
  ON public.pdf_import_batches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view import items"
  ON public.pdf_import_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert import items"
  ON public.pdf_import_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update import items"
  ON public.pdf_import_items FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view product images"
  ON public.product_images FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert product images"
  ON public.product_images FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
  ON public.product_images FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
  ON public.product_images FOR DELETE
  USING (auth.role() = 'authenticated');

-- Productos: permitir a usuarios autenticados actualizar el estado de revisión
CREATE POLICY "Authenticated users can view products"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert products"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE TRIGGER set_pdf_import_batches_updated_at
  BEFORE UPDATE ON public.pdf_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------
-- 6) Storage: bucket público para imágenes de productos de catálogo
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog-product-images', 'catalog-product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read catalog product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'catalog-product-images');

CREATE POLICY "Authenticated upload catalog product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'catalog-product-images' AND auth.role() = 'authenticated');
