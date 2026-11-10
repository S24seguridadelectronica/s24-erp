import { supabase } from '../supabase/client';

/**
 * Evidencias fotográficas en Supabase Storage.
 *
 * Las fotos se comprimen en el dispositivo (data URL JPEG) y se suben al
 * bucket `evidencias`. En la base solo se guarda la ruta, nunca el base64.
 */

const BUCKET = 'evidencias';

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('No se pudo leer la imagen comprimida.');
  return response.blob();
};

/** Sube una imagen (data URL) y devuelve la ruta dentro del bucket. */
export async function uploadEvidence(dataUrl: string, folder = 'general'): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl);
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const month = new Date().toISOString().slice(0, 7);
  const path = `${folder}/${month}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });

  if (error) throw error;
  return path;
}

/** URL pública de una ruta (o la misma URL si ya lo es). */
export function evidenceUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Descarga una imagen y la devuelve como data URL (para el PDF). */
export async function evidenceDataUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith('data:')) return path;

  try {
    const response = await fetch(evidenceUrl(path));
    if (!response.ok) return null;
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo convertir la imagen.'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Elimina una evidencia del bucket (mejor esfuerzo). */
export async function deleteEvidence(path: string): Promise<void> {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith('data:')) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn('[storage] No se pudo eliminar la evidencia:', error.message);
}
