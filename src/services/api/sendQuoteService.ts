import { supabase } from '../supabase/client';
import { generateQuotePdfBlob } from './quotePdf';
import { sendQuoteEmail } from './emailService';

const fmtMoney = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CO');

export function normalizePhone(phone?: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return '57' + digits;
  return digits;
}

// Función que genera y sube el PDF, retornando URL + blob
export async function uploadQuotePdf(quote: any): Promise<{ url: string | null; blob: Blob | null; fileName: string }> {
  const fileName = quote.quote_number + '_' + Date.now() + '.pdf';
  try {
    const { blob } = await generateQuotePdfBlob(quote);
    const { error } = await supabase.storage
      .from('cotizaciones')
      .upload(fileName, blob, { contentType: 'application/pdf' });
    if (error) throw error;
    const { data } = supabase.storage.from('cotizaciones').getPublicUrl(fileName);
    return { url: data?.publicUrl || null, blob, fileName };
  } catch (err) {
    console.error('❌ Error subiendo PDF:', err);
    return { url: null, blob: null, fileName };
  }
}

export async function sendQuoteByEmail(quote: any, pdfResult: { url: string | null; blob: Blob | null; fileName: string }): Promise<'sent' | 'fallback' | 'no-email'> {
  const toEmail = quote.customers?.email?.trim();
  if (!toEmail) return 'no-email';

  const emailData = {
    toEmail: toEmail,
    toName: quote.customers?.full_name?.trim() || 'Cliente',
    quoteNumber: quote.quote_number,
    total: fmtMoney(quote.total),
    pdfLink: pdfResult.url || '(PDF no disponible)',
    pdfBlob: pdfResult.blob || undefined,
    pdfFileName: pdfResult.fileName
  };

  const ok = await sendQuoteEmail(emailData);
  return ok ? 'sent' : 'fallback';
}

export function sendQuoteByWhatsApp(quote: any, pdfUrl: string | null): string | null {
  const rawPhone = quote.customers?.whatsapp_phone || quote.customers?.phone;
  const digits = (rawPhone || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? '57' + digits : digits;
  
  if (!phone) {
    console.warn('️ No hay número de teléfono o WhatsApp registrado.');
    return null;
  }

  const msg = encodeURIComponent(
    'Hola ' + (quote.customers?.full_name || '') + ', le saluda S24 Seguridad Electronica.\n' +
    'Le compartimos la cotizacion ' + quote.quote_number + ' por ' + fmtMoney(quote.total) + '.\n' +
    (pdfUrl ? 'Descargue el PDF aqui: ' + pdfUrl : '') +
    '\nQuedamos atentos.'
  );
  
  const whatsappUrl = 'https://wa.me/' + phone + '?text=' + msg;
  console.log('📱 URL de WhatsApp:', whatsappUrl);
  
  const newWindow = window.open(whatsappUrl, '_blank');
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    console.warn('⚠️ El navegador bloqueó la ventana de WhatsApp');
    return whatsappUrl;
  }
  return whatsappUrl;
}

export async function logSend(quoteId: number, method: string, pdfUrl: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  await (supabase.from('quote_send_log') as any).insert({
    quote_id: quoteId,
    method,
    pdf_url: pdfUrl,
    sent_by: user?.id || null
  });
}

export async function getSendHistory(quoteId: number) {
  const { data } = await (supabase.from('quote_send_log') as any)
    .select('*')
    .eq('quote_id', quoteId)
    .order('sent_at', { ascending: false });
  return data || [];
}
