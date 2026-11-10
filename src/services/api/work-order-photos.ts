import { supabase } from '../supabase/client';
import { evidenceUrl, uploadEvidence } from './storage';

export interface WorkOrderPhoto {
  id: number;
  work_order_id: number;
  caption: string | null;
  /** URL lista para mostrar (Storage o base64 de registros antiguos). */
  photo: string;
  /** Ruta en Storage (null en registros antiguos). */
  storage_path?: string | null;
  created_by?: string | null;
  created_at: string;
}

/** Convierte la fila de la base en una foto mostrable. */
const resolveRow = (row: any): WorkOrderPhoto => ({
  ...row,
  photo: row.storage_path ? evidenceUrl(row.storage_path) : row.photo,
});

const isMissingStorageColumn = (error: any): boolean => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return code === 'PGRST204' || code === '42703' || /storage_path/i.test(message);
};

/** Evidencias de una orden, en orden cronológico. */
export async function getWorkOrderPhotos(workOrderId: number): Promise<WorkOrderPhoto[]> {
  const { data, error } = await (supabase as any)
    .from('work_order_photos')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(resolveRow);
}

/** Evidencias de varias órdenes a la vez (para el historial del cliente). */
export async function getPhotosForOrders(orderIds: number[]): Promise<WorkOrderPhoto[]> {
  if (!orderIds.length) return [];

  const { data, error } = await (supabase as any)
    .from('work_order_photos')
    .select('*')
    .in('work_order_id', orderIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(resolveRow);
}

export async function addWorkOrderPhoto(
  workOrderId: number,
  photo: string,
  caption = '',
): Promise<WorkOrderPhoto> {
  const { data: { user } } = await supabase.auth.getUser();
  const base = {
    work_order_id: workOrderId,
    caption: caption.trim() || null,
    created_by: user?.id || null,
  };

  let path: string | null = null;
  try {
    path = await uploadEvidence(photo, `ordenes/${workOrderId}`);
  } catch (error) {
    console.warn('[fotos] No se pudo subir a Storage; se guarda en base64:', error);
  }

  if (path) {
    const { data, error } = await (supabase as any)
      .from('work_order_photos')
      .insert([{ ...base, photo: '', storage_path: path }])
      .select()
      .single();

    if (!error) return resolveRow(data);
    if (!isMissingStorageColumn(error)) throw error;
  }

  const { data, error } = await (supabase as any)
    .from('work_order_photos')
    .insert([{ ...base, photo }])
    .select()
    .single();

  if (error) throw error;
  return resolveRow(data);
}

export async function updateWorkOrderPhoto(
  id: number,
  patch: { caption?: string | null },
): Promise<void> {
  const { error } = await (supabase as any)
    .from('work_order_photos')
    .update(patch)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteWorkOrderPhoto(id: number): Promise<void> {
  const { error } = await (supabase as any)
    .from('work_order_photos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
