import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

export function buildQuotePdf(quote: any): { doc: any; filename: string } {
  const doc = new jsPDF();

  const primaryColor = [13, 42, 78];
  const accentColor = [255, 193, 7];
  const textColor = [51, 51, 51];

  // HEADER
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('S24', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Seguridad Electrónica', 14, 28);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN N° ' + quote.quote_number, 140, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const fechaEmision = quote.created_at ? new Date(quote.created_at).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO');
  doc.text('Fecha de emisión: ' + fechaEmision, 140, 28);

  // CLIENTE
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', 14, 55);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nombre: ' + (quote.customers?.full_name || 'N/A'), 14, 62);
  doc.text('Empresa: ' + (quote.customers?.company_name || '-'), 14, 68);
  doc.text('Email: ' + (quote.customers?.email || '-'), 14, 74);
  doc.text('Teléfono: ' + (quote.customers?.phone || '-'), 14, 80);
  doc.text('Ciudad: ' + (quote.customers?.city || '-'), 14, 86);

  // VALIDEZ
  doc.setFont('helvetica', 'bold');
  doc.text('VALIDEZ', 120, 55);
  doc.setFont('helvetica', 'normal');
  const validez = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('es-CO') : 'No definida';
  doc.text('Válida hasta: ' + validez, 120, 62);
  const estadoLabels: Record<string, string> = {
    draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada', rejected: 'Rechazada', converted: 'Convertida'
  };
  doc.text('Estado: ' + (estadoLabels[quote.status] || quote.status), 120, 68);

  // TABLA DE ITEMS
  const items = quote.items || [];
  const tableData = items.map((item: any, index: number) => [
    index + 1,
    item.item_type === 'product' ? 'Producto' : 'Servicio',
    item.description || '',
    String(item.quantity || 0),
    '$' + Math.round(item.unit_price || 0).toLocaleString('es-CO'),
    (item.discount || 0) + '%',
    '$' + Math.round((item.quantity * item.unit_price) * (1 - (item.discount || 0) / 100) * (1 + (item.tax_rate || 19) / 100)).toLocaleString('es-CO')
  ]);

  autoTable(doc, {
    startY: 95,
    margin: { horizontal: 14 },
    head: [['#', 'Tipo', 'Descripción', 'Cant.', 'P. Unit.', 'Desc.', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: textColor },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 62 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' }
    }
  });

  // TOTALES
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const rightMargin = 196;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', rightMargin - 40, finalY, { align: 'right' });
  doc.text('$' + Math.round(quote.subtotal || 0).toLocaleString('es-CO'), rightMargin, finalY, { align: 'right' });
  doc.text('Descuento:', rightMargin - 40, finalY + 6, { align: 'right' });
  doc.text('-$' + Math.round(quote.discount_amount || 0).toLocaleString('es-CO'), rightMargin, finalY + 6, { align: 'right' });
  doc.text('IVA (19%):', rightMargin - 40, finalY + 12, { align: 'right' });
  doc.text('$' + Math.round(quote.tax_amount || 0).toLocaleString('es-CO'), rightMargin, finalY + 12, { align: 'right' });

  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(rightMargin - 60, finalY + 18, 60, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL:', rightMargin - 40, finalY + 25, { align: 'right' });
  doc.text('$' + Math.round(quote.total || 0).toLocaleString('es-CO'), rightMargin, finalY + 25, { align: 'right' });

  // TÉRMINOS
  const termsY = finalY + 40;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TÉRMINOS Y CONDICIONES', 14, termsY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const terms = quote.terms || 'Pago contra entrega. Garantía de 12 meses en equipos y 6 meses en instalación. Precios sujetos a cambios sin previo aviso.';
  const splitTerms = doc.splitTextToSize(terms, 180);
  doc.text(splitTerms, 14, termsY + 6);

  // FIRMAS
  const signatureY = termsY + 35;
  doc.setDrawColor(textColor[0], textColor[1], textColor[2]);
  doc.line(14, signatureY, 90, signatureY);
  doc.line(120, signatureY, 196, signatureY);
  doc.setFontSize(8);
  doc.text('Firma del Cliente', 14, signatureY + 5);
  doc.text('Firma S24 Seguridad Electrónica', 120, signatureY + 5);

  // EMPRESA / RAZÓN SOCIAL Y DIRECCIÓN
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const empresa = quote.customers?.company_name || '';
  const direccion = quote.customers?.address || '';
  const ciudad = quote.customers?.city || '';
  if (empresa || direccion) {
    const infoEmpresa = empresa + (direccion ? ' - ' + direccion : '') + (ciudad ? ', ' + ciudad : '');
    doc.text(infoEmpresa, 105, signatureY + 20, { align: 'center' });
  }

  // FOOTER
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text('S24 Seguridad Electrónica - Tel: (601) 000-0000 - Email: info@s24.com.co - www.s24.com.co', 105, 290, { align: 'center' });

  const filename = 'Cotizacion_' + quote.quote_number + '_' + String(quote.customers?.full_name || 'cliente').replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf';
  return { doc, filename };
}

export async function generateQuotePdf(quote: any) {
  const { doc, filename } = buildQuotePdf(quote);
  doc.save(filename);
  return doc;
}

export async function generateQuotePdfBlob(quote: any): Promise<{ blob: Blob; filename: string }> {
  const { doc, filename } = buildQuotePdf(quote);
  return { blob: doc.output('blob'), filename };
}

