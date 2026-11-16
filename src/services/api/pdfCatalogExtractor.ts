/**
 * Motor de extracción de catálogos PDF (ERP S24).
 *
 * Utiliza pdfjs-dist para:
 *  - Detectar si el PDF es digital (texto seleccionable) o escaneado.
 *  - Extraer texto con coordenadas por página.
 *  - Identificar bloques de productos (ref / nombre / precio).
 *  - Extraer las imágenes incrustadas y asociarlas al bloque de producto
 *    más cercano por proximidad vertical/horizontal en la página.
 *
 * Reglas: no se inventan datos; los campos no detectados quedan null y el
 * producto queda "pending" de revisión.
 */
import * as pdfjsLib from 'pdfjs-dist';
// Worker de pdf.js servido como asset por Vite
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ExtractedProduct {
  sku: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  model: string | null;
  description: string | null;
  characteristics: { nombre: string; valor: string }[] | null;
  price: number | null;
  previous_price: number | null;
  currency: string | null;
  warranty_text: string | null;
  source_page: number;
  image_data_url: string | null;
  image_mime: string | null;
  image_hash: string | null;
  raw_text: string | null;
  review_status: 'pending';
  match_status: 'new' | 'existing' | 'updated' | 'pending';
  validation_notes: string[];
}

export interface PdfAnalysis {
  doc_type: 'digital' | 'scanned' | 'mixed' | 'unknown';
  total_pages: number;
  text_chars: number;
  images_found: number;
  products: ExtractedProduct[];
}

// ---------------------------------------------------------------------
// Utilidades de parsing
// ---------------------------------------------------------------------

/** Limpia un precio en formato colombiano: $150.000 COP -> 150000 */
export function parseMoney(raw: string): { value: number; currency: string | null } | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();

  // Detectar moneda por símbolo/prefijo
  let currency: string | null = null;
  if (/\bCOP\b/i.test(text)) currency = 'COP';
  else if (/\bUSD\b|\bUS\$|\bD[oó]lares?\b/i.test(text)) currency = 'USD';
  else if (/\bEUR\b|€/i.test(text)) currency = 'EUR';
  else if (/^\s*\$/.test(text)) currency = 'COP'; // $ en Colombia por defecto

  // Tomar el primer grupo numérico con separadores
  const match = text.match(/(?:\$|C\.?O\.?P\.?|USD|EUR)?\s*([\d.,]+(?:\s?000)*)/i);
  if (!match) return null;

  let num = match[1];
  // Si hay puntos y comas: asumir formato latino 1.234.567,89
  if (num.includes(',') && num.includes('.')) num = num.replace(/\./g, '').replace(',', '.');
  else if (num.includes(',') && !num.includes('.')) {
    // 150,000 -> 150000 ; 1,5 -> 1.5
    num = /^\d{1,3},\d{3}(\.\d+)?$/.test(num) || num.replace(/,/g, '').length >= 4
      ? num.replace(/,/g, '')
      : num.replace(',', '.');
  }
  num = num.replace(/\.(?=\d{3}\b)/g, '').replace(/[^0-9.]/g, '');

  const value = parseFloat(num);
  if (!isFinite(value) || value <= 0) return null;
  // Filtrar valores que parecen códigos (año, cantidades pequeñas típicas de referencias)
  if (value < 100) return null;
  return { value, currency };
}

const SKU_RE = /\b(?:ref(?:erencia)?|codigo|sku|part|model)\s*[:.]?\s*([A-Z0-9][A-Z0-9\-_.]{2,20})\b/i;
const WARRANTY_RE = /\b(?:garant[ií]a|warranty)\s*[:.]?\s*(.{3,60})/i;

/** Determina si una línea parece nombre de producto (no precio, no ruido). */
function looksLikeProductTitle(line: string): boolean {
  if (line.length < 4 || line.length > 160) return false;
  if (parseMoney(line)) return false;
  if (/^p[aá]gina\s*\d+/i.test(line)) return false;
  if (/^www\.|https?:|@|tel[eé]fono|whatsapp/i.test(line)) return false;
  // Debe tener alguna letra y palabra de longitud >= 3
  return /[a-zA-Z]{3,}/.test(line) && line.split(/\s+/).length >= 1;
}

function hashBytes(bytes: Uint8Array): string {
  let h = 0;
  for (let i = 0; i < bytes.length; i++) {
    h = (h * 31 + bytes[i]) | 0;
  }
  return 'h' + (h >>> 0).toString(16) + '-' + bytes.length;
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

// ---------------------------------------------------------------------
// Extracción por página
// ---------------------------------------------------------------------

interface TextItemInfo {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Block {
  items: TextItemInfo[];
  x0: number; x1: number; y0: number; y1: number;
  text: string;
  sku: string | null;
  price: number | null;
  currency: string | null;
  previous_price: number | null;
  warranty: string | null;
}

const VERTICAL_GAP_FACTOR = 1.6; // separación vertical para agrupar líneas en un bloque

function groupLinesIntoBlocks(items: TextItemInfo[]): Block[] {
  // Ordenar por y descendente (pdf.js: y=0 es abajo) y luego x
  const sorted = [...items].sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const lines: TextItemInfo[][] = [];
  let current: TextItemInfo[] = [];

  for (const it of sorted) {
    if (current.length === 0) { current = [it]; continue; }
    const last = current[current.length - 1];
    const gap = Math.abs(last.y - it.y);
    const tolerance = Math.max(last.height, it.height) * 0.8;
    if (gap <= tolerance) current.push(it);
    else { lines.push(current); current = [it]; }
  }
  if (current.length) lines.push(current);

  // Agrupar líneas en bloques por separación vertical
  const blocks: Block[] = [];
  let blockLines: TextItemInfo[][] = [];
  let lastLineY: number | null = null;

  for (const line of lines) {
    const lineY = line[0].y;
    const lineH = Math.max(...line.map(i => i.height));
    if (lastLineY === null || Math.abs(lastLineY - lineY) <= lineH * VERTICAL_GAP_FACTOR) {
      blockLines.push(line);
    } else {
      blocks.push(buildBlock(blockLines));
      blockLines = [line];
    }
    lastLineY = lineY;
  }
  if (blockLines.length) blocks.push(buildBlock(blockLines));
  return blocks;

  function buildBlock(bLines: TextItemInfo[][]): Block {
    const itemsFlat = bLines.flat();
    const x0 = Math.min(...itemsFlat.map(i => i.x));
    const x1 = Math.max(...itemsFlat.map(i => i.x + i.width));
    const y0 = Math.min(...itemsFlat.map(i => i.y));
    const y1 = Math.max(...itemsFlat.map(i => i.y + i.height));
    const text = bLines
      .map(l => l.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim())
      .filter(Boolean)
      .join('\n');

    let sku: string | null = null;
    let price: number | null = null;
    let currency: string | null = null;
    let previous_price: number | null = null;
    let warranty: string | null = null;

    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!sku) {
        const m = line.match(SKU_RE);
        if (m) sku = m[1];
      }
      if (!warranty) {
        const w = line.match(WARRANTY_RE);
        if (w) warranty = w[1].trim();
      }
      const money = parseMoney(line);
      if (money && price === null) {
        price = money.value;
        currency = money.currency;
      } else if (money && price !== null && previous_price === null) {
        previous_price = money.value; // segundo precio en el bloque
      }
    }

    return { items: itemsFlat, x0, x1, y0, y1, text, sku, price, currency, previous_price, warranty };
  }
}

/** Precio suelto fuera de bloques (columnas de precios): no se usa para inventar; solo si está pegado al bloque. */
function findNearestImage(images: { x: number; y: number; width: number; height: number; data: Uint8Array; mime: string; }[], block: Block): number | null {
  let bestIdx: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const cx = img.x + img.width / 2;
    const cy = img.y + img.height / 2;
    const bx = block.x0 + (block.x1 - block.x0) / 2;
    const by = block.y0 + (block.y1 - block.y0) / 2;
    const dx = Math.abs(cx - bx);
    const dy = Math.abs(cy - by);
    // La imagen debe estar a la izquierda o arriba del texto, típico de catálogos
    const dist = dx + dy * 2;
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  // Solo asociar si la imagen está razonablemente cerca (misma fila o encima)
  if (bestIdx !== null && bestDist < 400) return bestIdx;
  return null;
}

// ---------------------------------------------------------------------
// Análisis principal
// ---------------------------------------------------------------------

export async function analyzePdf(
  file: File,
  options: {
    defaultBrand?: string;
    defaultCategory?: string;
    supplierName?: string;
    onProgress?: (stage: string, current: number, total: number) => void;
  } = {}
): Promise<PdfAnalysis> {
  const { onProgress } = options;
  const buffer = await file.arrayBuffer();

  onProgress?.('Leyendo PDF', 0, 1);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const totalPages = pdf.numPages;

  const products: ExtractedProduct[] = [];
  let textChars = 0;
  let imagesFound = 0;
  let pagesWithText = 0;
  const seenImageHashes = new Set<string>();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.('Analizando páginas', pageNum, totalPages);
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    // ---- Texto ----
    const textContent = await page.getTextContent();
    const textItems: TextItemInfo[] = [];
    for (const item of textContent.items as any[]) {
      if (!('str' in item) || !item.str || !item.str.trim()) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const x = tx[4];
      const y = viewport.height - tx[5]; // convertir a origen superior
      const height = Math.abs(tx[3]) || 10;
      textItems.push({ str: item.str, x, y, width: item.width || 0, height });
      textChars += item.str.length;
    }

    if (textItems.length > 5) pagesWithText++;

    // ---- Imágenes incrustadas ----
    const images: { x: number; y: number; width: number; height: number; data: Uint8Array; mime: string; }[] = [];
    try {
      const operatorList = await page.getOperatorList();
      const commonObjs = (page as any).objs;
      const pageObjs = (page as any)._page?.objs || commonObjs;

      for (let i = 0; i < operatorList.fnArray.length; i++) {
        if (operatorList.fnArray[i] !== pdfjsLib.OPS.paintImageXObject) continue;
        const name = operatorList.argsArray[i][0] as string;
        let obj: any = null;
        try { obj = pageObjs?.get?.(name); } catch { /* ignore */ }
        if (!obj || !obj.data) continue;

        const { width, height, data } = obj;
        if (!data || width < 40 || height < 40) continue; // descartar iconos pequeños
        const mime = 'image/jpeg';
        // Reconstrucción básica: pdf.js entrega datos RGB crudos; convertir a PNG
        const dataUrl = rawToDataUrl(data, width, height, (obj as { kind?: number }).kind === 1 ? 1 : 3);
        if (!dataUrl) continue;
        const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
        const hash = hashBytes(bytes);
        if (seenImageHashes.has(hash)) continue; // imagen repetida
        seenImageHashes.add(hash);

        // posición aproximada: transform del operador actual
        const transform = operatorList.argsArray[i + 1] || null;
        let ix = 0, iy = 0, iw = width, ih = height;
        if (Array.isArray(transform) && transform.length >= 6) {
          const t = transform as number[];
          iw = Math.abs(t[0]) || width;
          ih = Math.abs(t[3]) || height;
          ix = t[4];
          iy = pageHeight - t[5] - ih;
        }
        imagesFound++;
        images.push({ x: ix, y: iy, width: iw, height: ih, data: bytes, mime });
      }
    } catch (imgErr) {
      // La extracción de imágenes es best-effort por página
      console.warn(`[pdfExtractor] imágenes página ${pageNum}:`, imgErr);
    }

    // ---- Bloques de productos ----
    const blocks = groupLinesIntoBlocks(textItems);
    for (const block of blocks) {
      const hasSkuOrTitle = block.sku !== null || looksLikeProductTitle(block.text.split('\n')[0] || '');
      const hasMoney = block.price !== null || block.previous_price !== null;
      if (!hasSkuOrTitle && !hasMoney) continue;
      if (!hasSkuOrTitle && hasMoney) {
        // Bloque de solo precio: intentar fusionar más adelante no trivial; marcar para revisión
      }

      const lines = block.text.split('\n').filter(Boolean);
      const titleLine = lines.find(l => looksLikeProductTitle(l)) || null;

      // Un producto solo se crea si hay algo identificable
      if (!titleLine && !block.sku) continue;

      const imgIdx = findNearestImage(images, block);
      let imageDataUrl: string | null = null;
      let imageHash: string | null = null;
      if (imgIdx !== null) {
        const img = images[imgIdx];
        imageDataUrl = bytesToDataUrl(img.data, img.mime);
        imageHash = hashBytes(img.data);
      }

      const notes: string[] = [];
      if (!block.sku) notes.push('SKU no detectado: revisar referencia manualmente');
      if (block.price === null) notes.push('Precio no detectado');
      if (imgIdx === null) notes.push('Sin fotografía asociada');

      products.push({
        sku: block.sku,
        name: titleLine,
        brand: options.defaultBrand || null,
        category: options.defaultCategory || null,
        subcategory: null,
        model: null,
        description: block.text,
        characteristics: null,
        price: block.price,
        previous_price: block.previous_price,
        currency: block.currency,
        warranty_text: block.warranty,
        source_page: pageNum,
        image_data_url: imageDataUrl,
        image_mime: imgIdx !== null ? images[imgIdx].mime : null,
        image_hash: imageHash,
        raw_text: block.text,
        review_status: 'pending',
        match_status: 'new',
        validation_notes: notes,
      });
    }
  }

  const docType: PdfAnalysis['doc_type'] =
    textChars > 200 * Math.max(totalPages, 1) * 0.3 ? 'digital'
      : textChars < 50 ? 'scanned'
        : pagesWithText > 0 && textChars < 200 * totalPages ? 'mixed'
          : 'unknown';

  onProgress?.('Extracción finalizada', totalPages, totalPages);

  return {
    doc_type: docType,
    total_pages: totalPages,
    text_chars: textChars,
    images_found: imagesFound,
    products,
  };
}

/** Convierte datos RGB/Grayscale crudos de pdf.js a data URL PNG vía canvas. */
function rawToDataUrl(data: Uint8Array | Uint8ClampedArray, width: number, height: number, comps: number): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imgData = ctx.createImageData(width, height);
    const dst = imgData.data;
    for (let i = 0, p = 0; i < data.length; i += comps, p += 4) {
      if (comps === 1) {
        dst[p] = dst[p + 1] = dst[p + 2] = data[i];
      } else {
        dst[p] = data[i];
        dst[p + 1] = data[i + 1];
        dst[p + 2] = data[i + 2];
      }
      dst[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
