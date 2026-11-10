/**
 * Utilidades para manejar las fotos de evidencia de una cotización.
 *
 * Las fotos se guardan en Supabase Storage y en la base queda solo la ruta.
 * Los registros antiguos todavía pueden traer un data URL en base64; por eso
 * las funciones aceptan ambos formatos.
 */

/** Máximo de fotos por equipo (cámara o grabador). */
export const MAX_PHOTOS_PER_EQUIPMENT = 3;

/** Aviso de fotos por cotización (ya no es un límite duro: viven en Storage). */
export const MAX_PHOTOS_PER_QUOTE = 60;

/** Fotos que se imprimen en el PDF; el resto queda en el historial. */
export const MAX_PHOTOS_IN_PDF = 12;

const isImageRef = (value: unknown): boolean =>
  typeof value === 'string'
  && (value.startsWith('data:image') || /^https?:\/\//i.test(value));

/**
 * Convierte el contenido de `photo` en una lista de imágenes válidas
 * (data URLs o rutas/URLs de Storage). Nunca lanza.
 */
export function parsePhotos(value?: string | null): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];

  const trimmed = value.trim();

  // Formato antiguo: una sola imagen.
  if (isImageRef(trimmed)) return [trimmed];

  // Formato nuevo: arreglo serializado.
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is string => isImageRef(entry));
    } catch {
      return [];
    }
  }

  return [];
}

/** Serializa la lista para guardarla en la columna `photo`. */
export function serializePhotos(photos: string[]): string | null {
  const valid = photos.filter(isImageRef);
  return valid.length > 0 ? JSON.stringify(valid) : null;
}

/** Cantidad de fotos válidas dentro de un valor de `photo`. */
export function countPhotos(value?: string | null): number {
  return parsePhotos(value).length;
}
