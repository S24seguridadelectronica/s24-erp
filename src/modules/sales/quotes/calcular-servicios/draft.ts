import type { Items, DvrGroup, VideoCause } from './types';
import { SERVICES, SYSTEMS, type ServiceForm, type ServiceKey, type SystemType } from './catalog';

/* =========================================================================
 * Borrador del cálculo
 * -------------------------------------------------------------------------
 * Guarda el trabajo en curso en el dispositivo para que no se pierda si se
 * cierra la app o se recarga la página. Las fotos viajan dentro del borrador;
 * si exceden la cuota de localStorage se reintenta sin fotos y se informa.
 * ========================================================================= */

export interface CalculatorDraft {
  version: 1;
  savedAt: string;
  service: ServiceKey;
  system: SystemType;
  data: ServiceForm;
  videoCause: VideoCause;
  videoMaterials: Items;
  maintenanceMaterials: Items;
  dvrGroups: DvrGroup[];
}

export type DraftInput = Omit<CalculatorDraft, 'version' | 'savedAt'>;
export type DraftStatus = 'saved' | 'saved-without-photos' | 'failed';

const STORAGE_KEY = 's24.calculator.draft.v1';
/** Tope prudente: localStorage ronda 5 MB por origen. */
const MAX_BYTES = 4_000_000;

const stripPhotos = (groups: DvrGroup[]): DvrGroup[] =>
  groups.map(group => ({
    ...group,
    photos: [],
    cameras: group.cameras.map(camera => ({ ...camera, photos: [] })),
  }));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Comprueba que el borrador tenga la forma mínima para no romper la calculadora. */
const isValidDraft = (draft: Partial<CalculatorDraft>): boolean => {
  if (!draft.service || !(draft.service in SERVICES)) return false;
  if (!draft.system || !(draft.system in SYSTEMS)) return false;
  if (!isRecord(draft.data)) return false;
  if (!isRecord(draft.videoMaterials) || !isRecord(draft.maintenanceMaterials)) return false;
  if (!Array.isArray(draft.dvrGroups) || draft.dvrGroups.length === 0) return false;

  return draft.dvrGroups.every(group =>
    isRecord(group)
    && Array.isArray(group.photos)
    && isRecord(group.maintenance)
    && isRecord(group.difficulties)
    && Array.isArray(group.cameras)
    && group.cameras.every(camera => isRecord(camera) && isRecord(camera.tasks) && Array.isArray(camera.photos)),
  );
};

export function readDraft(): CalculatorDraft | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const draft = parsed as Partial<CalculatorDraft>;
    if (draft.version !== 1 || !isValidDraft(draft)) return null;

    return draft as CalculatorDraft;
  } catch {
    return null;
  }
}

export function writeDraft(input: DraftInput): DraftStatus {
  const payload = (groups: DvrGroup[]): CalculatorDraft => ({
    ...input,
    dvrGroups: groups,
    version: 1,
    savedAt: new Date().toISOString(),
  });

  if (typeof localStorage === 'undefined') return 'failed';

  try {
    const serialized = JSON.stringify(payload(input.dvrGroups));
    if (serialized.length <= MAX_BYTES) {
      localStorage.setItem(STORAGE_KEY, serialized);
      return 'saved';
    }
  } catch {
    /* cuota llena o almacenamiento bloqueado: se intenta sin fotos */
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload(stripPhotos(input.dvrGroups))));
    return 'saved-without-photos';
  } catch {
    return 'failed';
  }
}

export function clearDraft(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin almacenamiento: nada que limpiar */
  }
}
