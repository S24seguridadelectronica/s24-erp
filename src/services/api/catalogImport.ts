/**
 * Servicio de importación de catálogos PDF (ERP S24).
 *
 * Flujo: analizar PDF -> vista previa editable -> confirmar ->
 *   1. Detectar duplicados contra `products` (por SKU exacto o marca+nombre)
 *   2. Subir imágenes a Storage (bucket catalog-product-images)
 *   3. Registrar productos en la tabla central `products`
 *   4. Registrar historial en pdf_import_batches / pdf_import_items
 *   5. Registrar imágenes en product_images
 *
 * No se sobrescriben datos comerciales sin la estrategia configurada.
 */
import { supabase } from '../supabase/client';
import { audit } from './audit';
import { generateCatalogExcel } from './catalogExcel';
import type { ExtractedProduct, PdfAnalysis } from './pdfCatalogExtractor';

export type { PdfAnalysis, ExtractedProduct } from './pdfCatalogExtractor';

const IMAGE_BUCKET = 'catalog-product-images';

export interface ConfirmConfig {
  supplierName: string;
  supplierId?: number | null;
  defaultBrand?: string;
  defaultCategory?: string;
  priceListType?: string;
  duplicateStrategy: 'skip' | 'update' | 'pending';
}

export interface ConfirmResult {
  batchId: number;
  created: number;
  updated: number;
  skipped: number;
  pending: number;
  errors: string[];
  imagesUploaded: number;
}

export interface DuplicateCheck {
  index: number;
  existingProductId: number;
  existing: Record<string, any>;
  incoming: Partial<ExtractedProduct>;
}

/** Detecta duplicados en el catálogo central antes de insertar. */
export async function checkDuplicates(
  products: ExtractedProduct[]
): Promise<DuplicateCheck[]> {
  const skus = products.map(p => p.sku).filter((s): s is string => !!s);
  const duplicates: DuplicateCheck[] = [];

  const { data: skuMatches } = skus.length
    ? await (supabase.from('products') as any).select('*').in('sku', skus)
    : { data: [] };
  const skuSet = new Map<string, any>((skuMatches || []).map((p: any) => [p.sku, p]));

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let match: any = null;
    if (p.sku && skuSet.has(p.sku)) match = skuSet.get(p.sku);

    if (!match && p.name && p.brand) {
      const { data } = await (supabase.from('products') as any)
        .select('*')
        .eq('brand', p.brand)
        .ilike('name', p.name.slice(0, 60))
        .limit(1);
      match = data?.[0] || null;
    }

    if (match) duplicates.push({ index: i, existingProductId: match.id, existing: match, incoming: p });
  }
  return duplicates;
}

async function uploadImage(
  productId: number,
  supplierSlug: string,
  product: ExtractedProduct
): Promise<{ path: string | null; publicUrl: string | null; size: number; mime: string } | null> {
  if (!product.image_data_url) return null;
  try {
    const res = await fetch(product.image_data_url);
    const blob = await res.blob();
    const mime = blob.type || product.image_mime || 'image/png';
    const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('png') ? 'png' : 'bin';
    const month = new Date().toISOString().slice(0, 7);
    const path = `${supplierSlug}/${month}/product-${productId}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, blob, { contentType: mime, upsert: false });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return { path, publicUrl, size: blob.size, mime };
  } catch (err) {
    console.warn('[catalogImport] Error subiendo imagen:', err);
    return null;
  }
}

function slugify(text: string): string {
  return (text || 'proveedor')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'proveedor';
}

/** Confirma la importación: sube imágenes, registra productos y guarda historial. */
export async function confirmImport(
  file: File,
  analysis: PdfAnalysis,
  products: ExtractedProduct[],
  config: ConfirmConfig,
  duplicateChecks: DuplicateCheck[],
  onProgress?: (stage: string, current: number, total: number) => void
): Promise<ConfirmResult> {
  const errors: string[] = [];
  let created = 0, updated = 0, skipped = 0, pending = 0, imagesUploaded = 0;

  // 1. Crear lote en el historial
  const { data: { user } } = await supabase.auth.getUser();
  const { data: batch, error: batchError } = await (supabase.from('pdf_import_batches') as any)
    .insert([{
      user_id: user?.id || null,
      file_name: file.name,
      file_size: file.size,
      total_pages: analysis.total_pages,
      supplier_name: config.supplierName,
      supplier_id: config.supplierId || null,
      default_brand: config.defaultBrand || null,
      default_category: config.defaultCategory || null,
      price_list_type: config.priceListType || null,
      duplicate_strategy: config.duplicateStrategy,
      doc_type: analysis.doc_type,
      status: 'processing',
      totals: {},
    }])
    .select()
    .single();
  if (batchError || !batch) throw batchError || new Error('No se pudo crear el lote de importación');

  const dupMap = new Map(duplicateChecks.map(d => [d.index, d]));
  const importItemRows: any[] = [];
  const supplierSlug = slugify(config.supplierName);

  // 2. Procesar producto por producto (uno con error no detiene el lote)
  for (let i = 0; i < products.length; i++) {
    onProgress?.('Registrando productos', i + 1, products.length);
    const p = products[i];
    const dup = dupMap.get(i);
    let productId: number | null = null;
    let matchStatus: string = 'new';
    let imagePath: string | null = null;
    let imageUrl: string | null = null;

    try {
      if (dup && config.duplicateStrategy === 'skip') {
        matchStatus = 'existing';
        skipped++;
        productId = dup.existingProductId;
      } else if (dup && config.duplicateStrategy === 'pending') {
        matchStatus = 'pending';
        pending++;
      } else {
        const payload: any = {
          sku: p.sku || `PDF-${batch.id}-${i + 1}`,
          name: p.name || p.raw_text?.split('\n')[0]?.slice(0, 120) || 'Producto sin nombre',
          category: p.category,
          brand: p.brand,
          description: p.description,
          subcategory: p.subcategory,
          model: p.model,
          currency: p.currency || 'COP',
          previous_price: p.previous_price,
          warranty_text: p.warranty_text,
          characteristics: p.characteristics,
          source_pdf: file.name,
          source_page: p.source_page,
          review_status: p.price === null || !p.sku ? 'pending' : 'pending',
          is_active: false, // se activa al publicar
        };
        // El precio del proveedor se guarda en `cost`; el precio de venta lo define S24
        if (p.price !== null) payload.cost = p.price;

        if (dup && config.duplicateStrategy === 'update') {
          // Solo actualizar campos comerciales autorizados; conservar precio de venta
          const { data: upd, error: updErr } = await (supabase.from('products') as any)
            .update({
              description: payload.description,
              category: payload.category,
              subcategory: payload.subcategory,
              cost: payload.cost ?? undefined,
              currency: payload.currency,
              previous_price: payload.previous_price,
              warranty_text: payload.warranty_text,
              characteristics: payload.characteristics,
              source_pdf: payload.source_pdf,
              source_page: payload.source_page,
            })
            .eq('id', dup.existingProductId)
            .select()
            .single();
          if (updErr) throw updErr;
          productId = upd.id;
          matchStatus = 'updated';
          updated++;
        } else {
          const { data: ins, error: insErr } = await (supabase.from('products') as any)
            .insert([payload])
            .select()
            .single();
          if (insErr) {
            // SKU duplicado en carrera: degradar a existente
            if (String(insErr.code) === '23505' && p.sku) {
              const { data: exist } = await (supabase.from('products') as any).select('id').eq('sku', p.sku).single();
              if (exist) { productId = exist.id; matchStatus = 'existing'; skipped++; }
              else throw insErr;
            } else throw insErr;
          } else {
            productId = ins.id;
            matchStatus = 'new';
            created++;
            await audit.log('create', 'products', String(ins.id), `Producto importado desde PDF: ${ins.name}`);
          }
        }

        // 3. Subir imagen y registrarla
        if (productId !== null) {
          const up = await uploadImage(productId, supplierSlug, p);
          if (up) {
            imagePath = up.path;
            imageUrl = up.publicUrl;
            imagesUploaded++;
            const { error: imgErr } = await (supabase.from('product_images') as any).insert([{
              product_id: productId,
              batch_id: batch.id,
              file_name: `${payload?.sku || productId}-p${p.source_page}`,
              storage_path: up.path,
              storage_bucket: IMAGE_BUCKET,
              mime_type: up.mime,
              size_bytes: up.size,
              source_pdf: file.name,
              source_page: p.source_page,
              content_hash: p.image_hash,
              is_primary: true,
              uploaded_by: user?.id || null,
            }]);
            if (imgErr) errors.push(`Imagen producto ${productId}: ${imgErr.message}`);

            if (matchStatus !== 'updated') {
              await (supabase.from('products') as any)
                .update({ image_url: up.publicUrl })
                .eq('id', productId);
            }
          }
        }
      }
    } catch (err: any) {
      errors.push(`Producto "${p.name || p.sku || i + 1}": ${err.message || err}`);
      pending++;
    }

    importItemRows.push({
      batch_id: batch.id,
      product_id: productId,
      existing_product_id: dup && matchStatus === 'existing' ? dup.existingProductId : null,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory,
      model: p.model,
      description: p.description,
      characteristics: p.characteristics,
      price: p.price,
      previous_price: p.previous_price,
      currency: p.currency,
      warranty_text: p.warranty_text,
      supplier_name: config.supplierName,
      image_path: imagePath,
      image_url: imageUrl,
      source_page: p.source_page,
      review_status: matchStatus === 'existing' ? 'published' : 'pending',
      match_status: matchStatus,
      validation_notes: p.validation_notes,
      raw_text: p.raw_text,
    });
  }

  // 4. Insertar historial de ítems
  const CHUNK = 100;
  for (let i = 0; i < importItemRows.length; i += CHUNK) {
    const { error } = await (supabase.from('pdf_import_items') as any)
      .insert(importItemRows.slice(i, i + CHUNK));
    if (error) errors.push(`Historial de ítems: ${error.message}`);
  }

  // 5. Finalizar lote
  const totals = {
    detected: products.length,
    created,
    updated,
    skipped,
    pending,
    images_uploaded: imagesUploaded,
    images_found: analysis.images_found,
  };
  await (supabase.from('pdf_import_batches') as any)
    .update({ status: errors.length ? 'completed_with_errors' : 'completed', totals, errors })
    .eq('id', batch.id);

  await audit.log('create', 'pdf_import_batches', String(batch.id),
    `Importación PDF "${file.name}": ${created} nuevos, ${updated} actualizados, ${skipped} duplicados`);

  return { batchId: batch.id, created, updated, skipped, pending, errors, imagesUploaded };
}

/** Publica productos aprobados en el catálogo central (visibles para cotizaciones). */
export async function publishProducts(productIds: number[]): Promise<number> {
  if (!productIds.length) return 0;
  const { error } = await (supabase.from('products') as any)
    .update({ is_active: true, review_status: 'published' })
    .in('id', productIds);
  if (error) throw error;
  for (const id of productIds) {
    await audit.log('update', 'products', String(id), 'Producto publicado en catálogo');
  }
  return productIds.length;
}

/** Obtiene el historial de importaciones PDF. */
export async function getImportHistory() {
  const { data, error } = await (supabase.from('pdf_import_batches') as any)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function getBatchItems(batchId: number) {
  const { data, error } = await (supabase.from('pdf_import_items') as any)
    .select('*')
    .eq('batch_id', batchId)
    .order('id');
  if (error) throw error;
  return data || [];
}

/** Excel con fotografías insertadas (bytes → celdas). */
export async function downloadExcelWithImages(products: ExtractedProduct[], meta: {
  supplierName: string; fileName: string; analysis: PdfAnalysis;
}) {
  return generateCatalogExcel(products, meta, { embedImages: true });
}

/** Excel solo con enlaces a las imágenes en Supabase. */
export async function downloadExcelWithLinks(products: ExtractedProduct[], urls: (string | null)[], meta: {
  supplierName: string; fileName: string; analysis: PdfAnalysis;
}) {
  return generateCatalogExcel(products, meta, { embedImages: false, imageUrlOverrides: urls });
}
