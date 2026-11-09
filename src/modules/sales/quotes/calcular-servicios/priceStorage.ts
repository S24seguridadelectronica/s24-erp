import { supabase } from '@/services/supabase/client';
import { DEFAULT_PRICES, PRICE_CONFIG } from './catalog';
import type { Prices } from './catalog';
import { nonNegative } from './calc';

/* -------------------------------------------------------------------------
 * Persistencia de precios + IVA
 * -------------------------------------------------------------------------
 * Nivel 1 (local): localStorage del dispositivo, disponible sin conexión.
 * Nivel 2 (empresa): tabla `site_settings` con `setting_key = 'quote_calculator_prices'`.
 *   Al abrir se carga el valor remoto (si existe) y cada cambio se sincroniza.
 *   Si no hay permisos de escritura, la app sigue funcionando con el nivel local.
 */
export interface StoredPriceData {
  prices: Prices;
  taxRate: number;
}

const STORAGE_KEY = 's24.quoteCalculator.prices.v2';
const REMOTE_KEY = 'quote_calculator_prices';
const DEFAULT_TAX_RATE = 19;

const DEFAULT_DATA: StoredPriceData = { prices: { ...DEFAULT_PRICES }, taxRate: DEFAULT_TAX_RATE };

const normalizePrices = (raw: unknown): Prices =>
  Object.fromEntries(
    PRICE_CONFIG.map(({ key, value }) => [key, nonNegative((raw as Record<string, unknown> | undefined)?.[key] ?? value)]),
  ) as Prices;

const normalizeTaxRate = (raw: unknown): number => {
  const value = nonNegative(raw);
  return value > 0 ? Math.min(100, value) : DEFAULT_TAX_RATE;
};

export const readStoredPrices = (): StoredPriceData => {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_DATA, prices: { ...DEFAULT_PRICES } };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DATA, prices: { ...DEFAULT_PRICES } };

    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'prices' in (parsed as Record<string, unknown>)) {
      const obj = parsed as { prices?: unknown; taxRate?: unknown };
      return { prices: normalizePrices(obj.prices), taxRate: normalizeTaxRate(obj.taxRate) };
    }

    // Formato v1: solo el objeto de precios.
    return { prices: normalizePrices(parsed), taxRate: DEFAULT_TAX_RATE };
  } catch {
    return { ...DEFAULT_DATA, prices: { ...DEFAULT_PRICES } };
  }
};

export const writeStoredPrices = (data: StoredPriceData): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento no disponible o cuota llena: la app sigue funcionando en memoria */
  }
};

/** Carga la configuración compartida de la empresa (si existe). */
export async function loadRemotePriceData(): Promise<StoredPriceData | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', REMOTE_KEY)
      .maybeSingle();

    if (error || !data?.setting_value) return null;

    const value = data.setting_value as { prices?: unknown; taxRate?: unknown };
    return { prices: normalizePrices(value?.prices), taxRate: normalizeTaxRate(value?.taxRate) };
  } catch {
    return null;
  }
}

/** Sincroniza la configuración hacia la empresa (mejor esfuerzo). */
export async function saveRemotePriceData(data: StoredPriceData): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from('site_settings')
      .upsert(
        { setting_key: REMOTE_KEY, setting_value: data, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' },
      );

    if (error) {
      console.warn('[precios] No se pudo sincronizar con site_settings:', error.message);
    }
  } catch (err) {
    console.warn('[precios] Error sincronizando con site_settings:', err);
  }
}
