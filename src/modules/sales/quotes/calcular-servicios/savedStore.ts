import type { DraftInput } from './draft';

/* =========================================================================
 * Cálculos guardados: plantillas reutilizables e historial de los últimos
 * trabajos agregados a una cotización.
 * ========================================================================= */

export type SavedKind = 'template' | 'auto';

export interface SavedCalculation {
  id: string;
  name: string;
  kind: SavedKind;
  savedAt: string;
  payload: DraftInput;
}

const STORAGE_KEY = 's24.calculator.saved.v1';
const MAX_ITEMS = 15;
const MAX_BYTES = 4_000_000;

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const stripPhotos = (payload: DraftInput): DraftInput => ({
  ...payload,
  dvrGroups: payload.dvrGroups.map(group => ({
    ...group,
    photos: [],
    cameras: group.cameras.map(camera => ({ ...camera, photos: [] })),
  })),
});

const persist = (items: SavedCalculation[]): SavedCalculation[] => {
  try {
    if (typeof localStorage === 'undefined') return items;
    const serialized = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, serialized.length <= MAX_BYTES
      ? serialized
      : JSON.stringify(items.map(item => ({ ...item, payload: stripPhotos(item.payload) }))));
  } catch {
    /* sin cuota: la lista sigue disponible en memoria */
  }
  return items;
};

export function readSaved(): SavedCalculation[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is SavedCalculation =>
      Boolean(entry)
      && typeof entry === 'object'
      && typeof (entry as SavedCalculation).id === 'string'
      && typeof (entry as SavedCalculation).name === 'string'
      && Boolean((entry as SavedCalculation).payload)
      && Array.isArray((entry as SavedCalculation).payload.dvrGroups),
    );
  } catch {
    return [];
  }
}

export function addSaved(name: string, payload: DraftInput, kind: SavedKind = 'template'): SavedCalculation[] {
  const cleanName = name.trim() || 'Cálculo sin nombre';
  const entry: SavedCalculation = {
    id: newId(),
    name: cleanName,
    kind,
    savedAt: new Date().toISOString(),
    payload,
  };

  const next = [entry, ...readSaved()].slice(0, MAX_ITEMS);
  return persist(next);
}

export function removeSaved(id: string): SavedCalculation[] {
  return persist(readSaved().filter(item => item.id !== id));
}
