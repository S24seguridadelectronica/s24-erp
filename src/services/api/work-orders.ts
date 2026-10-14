import { supabase } from '../supabase/client';

export interface WorkOrderMaterial {
  id?: number;
  work_order_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface WorkOrder {
  id?: number;
  order_number: string;
  customer_id: number;
  sale_id?: number;
  service_type: string;
  description?: string;
  address?: string;
  contact_name?: string;
  contact_phone?: string;
  assigned_to?: string;
  scheduled_at?: string;
  status: 'pending' | 'scheduled' | 'assigned' | 'in_transit' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  materials_cost?: number;
  labor_cost?: number;
  total_cost?: number;
  completed_at?: string;
  notes?: string;
  items?: WorkOrderMaterial[];
  created_at?: string;
  updated_at?: string;
}

export async function getWorkOrders() {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*, customers(full_name, company_name, phone), profiles!work_orders_assigned_to_fkey(full_name)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as any[];
}

export async function getWorkOrderById(id: number) {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*, items(*), customers(full_name, company_name, email, phone, address, city)')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as any;
}

export async function createWorkOrder(order: any, items: Omit<WorkOrderMaterial, 'id' | 'work_order_id'>[]) {
  const orderData = {
    order_number: order.order_number,
    customer_id: order.customer_id,
    sale_id: order.sale_id || null,
    service_type: order.service_type,
    description: order.description || null,
    address: order.address || null,
    contact_name: order.contact_name || null,
    contact_phone: order.contact_phone || null,
    assigned_to: order.assigned_to || null,
    scheduled_at: order.scheduled_at || null,
    status: order.status,
    priority: order.priority || 'medium',
    materials_cost: order.materials_cost || 0,
    labor_cost: order.labor_cost || 0,
    total_cost: (order.materials_cost || 0) + (order.labor_cost || 0),
    notes: order.notes || null
  };

  console.log('Insertando orden de trabajo:', orderData);

  const { data: orderResult, error: orderError } = await supabase
    .from('work_orders')
    .insert(orderData)
    .select()
    .single();
  
  if (orderError) {
    console.error('Error al insertar orden:', orderError);
    throw orderError;
  }

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({
      work_order_id: orderResult.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('work_order_materials')
      .insert(itemsWithOrderId);
    
    if (itemsError) {
      console.error('Error al insertar materiales:', itemsError);
      throw itemsError;
    }
  }

  return orderResult;
}

export async function updateWorkOrder(id: number, order: any) {
  const orderData: any = {
    order_number: order.order_number,
    customer_id: order.customer_id,
    sale_id: order.sale_id || null,
    service_type: order.service_type,
    description: order.description || null,
    address: order.address || null,
    contact_name: order.contact_name || null,
    contact_phone: order.contact_phone || null,
    assigned_to: order.assigned_to || null,
    scheduled_at: order.scheduled_at || null,
    status: order.status,
    priority: order.priority || 'medium',
    materials_cost: order.materials_cost || 0,
    labor_cost: order.labor_cost || 0,
    total_cost: (order.materials_cost || 0) + (order.labor_cost || 0),
    notes: order.notes || null,
    completed_at: order.status === 'completed' ? new Date().toISOString() : null
  };

  const { data, error } = await supabase
    .from('work_orders')
    .update(orderData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteWorkOrder(id: number) {
  const { error } = await supabase.from('work_order_materials').delete().eq('work_order_id', id);
  if (error) throw error;

  const { error: orderError } = await supabase.from('work_orders').delete().eq('id', id);
  if (orderError) throw orderError;
  
  return true;
}

export async function getNextWorkOrderNumber() {
  const { data, error } = await supabase
    .from('work_orders')
    .select('order_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].order_number.replace('OT-', ''));
    return `OT-${String(lastNumber + 1).padStart(4, '0')}`;
  }
  
  return 'OT-0001';
}

export async function getTechnicians() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name');
  
  if (error) throw error;
  return data || [];
}
