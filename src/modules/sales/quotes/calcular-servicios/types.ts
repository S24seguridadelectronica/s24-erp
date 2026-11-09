/* =========================================================================
 * Tipos
 * ========================================================================= */

export interface QuoteItem {
  item_type: 'product' | 'service';
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  photo?: string | null;
  detail?: Record<string, unknown> | null;
}

export interface CalcularServiciosProps {
  show: boolean;
  onHide: () => void;
  onAddItems: (items: QuoteItem[]) => void;
  /** Nombre del cliente de la cotización, para la vista previa del PDF. */
  customerName?: string;
}

export type ItemType = 'service' | 'product';

export interface ServiceLine {
  id: string;
  description: string;
  detail: string;
  amount: number;
  itemType: ItemType;
  photos: string[];
  /** Desglose estructurado (categoría, topes, metros) para auditoría y recalculo. */
  meta?: Record<string, unknown>;
}

export interface MaterialState { selected: boolean; quantity: number; unitPrice: number }
export interface DifficultyState { selected: boolean; price: number }
export interface CatalogItem {
  key: string; label: string; unit: string; defaultQuantity: number; defaultPrice: number;
}

export type Items = Record<string, MaterialState>;
export type Difficulties = Record<string, DifficultyState>;

export interface CameraGroup {
  id: string; label: string; tasks: Items; photos: string[];
  expanded: boolean; active: boolean; distance: string; height: string;
  cableDistance: string; cableHeight: string;
  difficulties: Difficulties;
  /** Observación del técnico sobre esta cámara. Viaja a la cotización. */
  note?: string;
}

export interface DvrGroup {
  id: string; label: string; included: boolean; active: boolean;
  distance: string; height: string; channels: string; photos: string[];
  difficulties: Difficulties; maintenance: Items; cameras: CameraGroup[];
  /** Observación del técnico sobre este grabador. */
  note?: string;
}

export type VideoCause = 'balun' | 'power' | 'splice' | 'cable' | 'camera' | 'dvr-channel' | 'unknown';
export type Option = [string, string];
