/**
 * Utilidades para manejar las fotos de evidencia de una cotización.
 *
 * Las fotos se guardan en la columna `quote_items.photo` (tipo text) como un
 * JSON con la lista de imágenes en base64 (`data:image/jpeg;base64,...`).
 * También se acepta el formato antiguo: un único data URL suelto.
 */

/** Máximo de fotos por equipo (cámara o grabador). */
export const MAX_PHOTOS_PER_EQUIPMENT = 3;

/** Máximo recomendado de fotos por cotización (protege el tamaño del guardado). */
export const MAX_PHOTOS_PER_QUOTE = 12;

const isDataImage = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('data:image');

/**
 * Convierte el contenido de `photo` en una lista de imágenes válidas.
 * Nunca lanza: ante datos corruptos devuelve una lista vacía.
 */
export function parsePhotos(value?: string | null): string[] {
  if (typeof value !== 'string' || value.trim() === '') return [];

  const trimmed = value.trim();

  // Formato antiguo: una sola imagen.
  if (isDataImage(trimmed)) return [trimmed];

  // Formato nuevo: arreglo serializado.
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((entry): entry is string => isDataImage(entry));
    } catch {
      return [];
    }
  }

  return [];
}

/** Serializa la lista para guardarla en la columna `photo`. */
export function serializePhotos(photos: string[]): string | null {
  const valid = photos.filter(isDataImage);
  return valid.length > 0 ? JSON.stringify(valid) : null;
}

/** Cantidad de fotos válidas dentro de un valor de `photo`. */
export function countPhotos(value?: string | null): number {
  return parsePhotos(value).length;
}
