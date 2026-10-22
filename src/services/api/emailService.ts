import emailjs from '@emailjs/browser';

export function isEmailConfigured() {
  return !!(import.meta.env.VITE_EMAILJS_SERVICE_ID && import.meta.env.VITE_EMAILJS_TEMPLATE_ID && import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
}

// Convierte un Blob a base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extraer solo la parte base64 (después de la coma)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function sendQuoteEmail(params: {
  toEmail: string;
  toName: string;
  quoteNumber: string;
  total: string;
  pdfLink: string;
  pdfBlob?: Blob;
  pdfFileName?: string;
}) {
  if (!isEmailConfigured()) {
    console.error('❌ EmailJS no está configurado. Revisa el archivo .env');
    return false;
  }

  const templateParams: any = {
    to_email: params.toEmail,
    to_name: params.toName,
    quote_number: params.quoteNumber,
    total: params.total,
    pdf_link: params.pdfLink
  };

  // Si tenemos el blob del PDF, lo convertimos a base64 y lo adjuntamos
  if (params.pdfBlob && params.pdfFileName) {
    try {
      const base64 = await blobToBase64(params.pdfBlob);
      templateParams.attachment = {
        name: params.pdfFileName,
        data: base64
      };
      console.log('📎 PDF adjuntado como base64:', params.pdfFileName);
    } catch (err) {
      console.error(' Error al convertir PDF a base64:', err);
    }
  }

  console.log('📤 Enviando a EmailJS con:', {
    service: import.meta.env.VITE_EMAILJS_SERVICE_ID,
    template: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    params: templateParams
  });

  try {
    const response = await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams,
      { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY }
    );
    console.log('✅ EmailJS respondió con éxito:', response);
    return true;
  } catch (error: any) {
    console.error('💥 Error detallado de EmailJS:', error);
    console.error('💥 Texto del error:', error?.text);
    return false;
  }
}
