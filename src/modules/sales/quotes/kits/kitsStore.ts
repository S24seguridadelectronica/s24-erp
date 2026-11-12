import { supabase } from '@/services/supabase/client';
import { INITIAL_KITS, type MaintenanceKit } from './types';
import { uid } from '../calcular-servicios/calc';

const STORAGE_KEY = 's24.quoteCalculator.kits.v1';
const REMOTE_KEY = 'quote_calculator_kits';

interface SiteSettingsClient {
  from(table: 'site_settings'): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { setting_value: unknown } | null; error: { message: string } | null }>;
      };
    };
    upsert(values: Record<string, unknown>, options: { onConflict: string }): Promise<{ error: { message: string } | null }>;
  };
}

const siteSettings = supabase as unknown as SiteSettingsClient;

function isValidKit(k: unknown): k is MaintenanceKit {
  if (!k || typeof k !== 'object') return false;
  const item = k as Partial<MaintenanceKit>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    (item.target === 'camera' || item.target === 'dvr' || item.target === 'both') &&
    Array.isArray(item.cameraTasks) &&
    Array.isArray(item.dvrTasks)
  );
}

export function readStoredKits(): MaintenanceKit[] {
  try {
    if (typeof localStorage === 'undefined') return [...INITIAL_KITS];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...INITIAL_KITS];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...INITIAL_KITS];

    const valid = parsed.filter(isValidKit);
    return valid.length > 0 ? valid : [...INITIAL_KITS];
  } catch {
    return [...INITIAL_KITS];
  }
}

export function writeStoredKits(kits: MaintenanceKit[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
  } catch {
    /* cuota llena o localStorage bloqueado: se mantiene en memoria */
  }
}

export async function loadRemoteKits(): Promise<MaintenanceKit[] | null> {
  try {
    const { data, error } = await siteSettings
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', REMOTE_KEY)
      .maybeSingle();

    if (error || !data?.setting_value) return null;

    const list = data.setting_value;
    if (!Array.isArray(list)) return null;

    const valid = list.filter(isValidKit);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export async function saveRemoteKits(kits: MaintenanceKit[]): Promise<boolean> {
  try {
    const { error } = await siteSettings
      .from('site_settings')
      .upsert(
        { setting_key: REMOTE_KEY, setting_value: kits, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' },
      );

    if (error) {
      console.warn('[kits] No se pudo sincronizar kits con site_settings:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[kits] Error sincronizando kits con site_settings:', err);
    return false;
  }
}

export function upsertKit(kits: MaintenanceKit[], kit: MaintenanceKit): MaintenanceKit[] {
  const index = kits.findIndex(k => k.id === kit.id);
  let next: MaintenanceKit[];
  if (index >= 0) {
    next = [...kits];
    next[index] = kit;
  } else {
    next = [...kits, kit];
  }
  writeStoredKits(next);
  return next;
}

export function duplicateKit(kits: MaintenanceKit[], kitId: string): MaintenanceKit[] {
  const source = kits.find(k => k.id === kitId);
  if (!source) return kits;

  const copy: MaintenanceKit = {
    ...source,
    id: `kit-${uid()}`,
    name: `${source.name} (copia)`,
    shortName: source.shortName ? `${source.shortName} (copia)` : undefined,
    isBuiltIn: false,
    active: true,
  };

  const next = [...kits, copy];
  writeStoredKits(next);
  return next;
}

export function deleteKit(kits: MaintenanceKit[], kitId: string): MaintenanceKit[] {
  const next = kits.filter(k => k.id !== kitId);
  writeStoredKits(next);
  return next;
}

export function toggleKitActive(kits: MaintenanceKit[], kitId: string, active: boolean): MaintenanceKit[] {
  const next = kits.map(k => (k.id === kitId ? { ...k, active } : k));
  writeStoredKits(next);
  return next;
}

export function resetKitsToDefault(): MaintenanceKit[] {
  const defaults = [...INITIAL_KITS];
  writeStoredKits(defaults);
  return defaults;
}
