/**
 * Generación del Excel de catálogo importado (ERP S24).
 * Hoja PRODUCTOS (una fila por producto) + hoja RESUMEN.
 * Opción de insertar las fotografías dentro de las celdas (ExcelJS addImage).
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ExtractedProduct, PdfAnalysis } from './pdfCatalogExtractor';

const HEADERS = ['REFERENCIA', 'DESCRIPCION', 'PRECIO'];
const HEADER_WIDTHS = [18, 70, 16];

export async function generateCatalogExcel(
  products: ExtractedProduct[],
  meta: { supplierName: string; fileName: string; analysis: PdfAnalysis },
  opts: { embedImages: boolean; imageUrlOverrides?: (string | null)[] }
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERP S24';
  wb.created = new Date();

  // ---------------- Hoja PRODUCTOS ----------------
  const ws = wb.addWorksheet('PRODUCTOS', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADERS.length } };

  ws.addRow(HEADERS);
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  headerRow.alignment = { vertical: 'middle' };
  HEADER_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  ws.getRow(1).height = 24;

  products.forEach(p => {
    const row = ws.addRow([
      p.sku ?? '',
      p.description || p.name || '',
      p.price ?? '',
    ]);
    row.alignment = { vertical: 'top', wrapText: true };
    // Formato numérico del precio (columna 3)
    ws.getCell(row.number, 3).numFmt = '#,##0.00';
  });

  // ---------------- Hoja RESUMEN ----------------
  const rs = wb.addWorksheet('RESUMEN');
  rs.getColumn(1).width = 32;
  rs.getColumn(2).width = 50;
  const complete = products.filter(p => p.sku && p.price !== null).length;
  const summary: [string, string | number][] = [
    ['Nombre del proveedor', meta.supplierName],
    ['Nombre del PDF', meta.fileName],
    ['Fecha de importación', new Date().toLocaleString('es-CO')],
    ['Tipo de documento', meta.analysis.doc_type],
    ['Total de páginas', meta.analysis.total_pages],
    ['Total de productos', products.length],
    ['Productos completos', complete],
    ['Productos pendientes', products.length - complete],
    ['Fotografías encontradas', meta.analysis.images_found],
    ['Fotografías asociadas', products.filter(p => p.image_data_url).length],
    ['Errores encontrados', products.filter(p => p.validation_notes.length).length],
  ];
  rs.addRow(['RESUMEN DE IMPORTACIÓN', '']);
  rs.getRow(1).font = { bold: true, size: 14 };
  summary.forEach(([k, v]) => rs.addRow([k, v]).font = { size: 11 });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `catalogo-${meta.supplierName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
}
