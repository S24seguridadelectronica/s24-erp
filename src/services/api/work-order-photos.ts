import { supabase } from '../supabase/client';

export interface WorkOrderPhoto {
  id: number;
  work_order_id: number;
  caption: string | null;
  photo: string;
  created_by?: string | null;
  created_at: string;
}

/** Evidencias de una orden, en orden cronológico. */
export async function getWorkOrderPhotos(workOrderId: number): Promise<WorkOrderPhoto[]> {
  const { data, error } = await (supabase as any)
    .from('work_order_photos')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
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
  return data || [];
}

export async function addWorkOrderPhoto(
  workOrderId: number,
  photo: string,
  caption = '',
): Promise<WorkOrderPhoto> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await (supabase as any)
    .from('work_order_photos')
    .insert([{
      work_order_id: workOrderId,
      photo,
      caption: caption.trim() || null,
      created_by: user?.id || null,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
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
