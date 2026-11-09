import { supabase } from '../supabase/client';
import { audit } from './audit';

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

export async function getWorkOrdersByCustomer(customerId: number) {
  const { data, error } = await (supabase as any)
    .from('work_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Orden de trabajo generada desde una cotización (el id de la cotización se guarda en sale_id). */
export async function getWorkOrderByQuoteId(quoteId: number) {
  const { data, error } = await (supabase as any)
    .from('work_orders')
    .select('*')
    .eq('sale_id', quoteId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/**
 * Crea la orden de trabajo a partir de una cotización aprobada.
 * Si ya existe una para esa cotización, la devuelve sin duplicar.
 */
export async function createWorkOrderFromQuote(quoteId: number) {
  const existing = await getWorkOrderByQuoteId(quoteId);
  if (existing) return { order: existing, created: false };

  const { data: quote, error: quoteError } = await (supabase as any)
    .from('quotes')
    .select('*, customers(full_name, company_name, address, contact_person, phone)')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) throw quoteError || new Error('No se encontró la cotización');

  const { data: items } = await (supabase as any)
    .from('quote_items')
    .select('description')
    .eq('quote_id', quoteId);

  const descriptions = (items || []).map((item: any) => String(item.description || '')).join(' | ');
  const serviceType = /mantenimiento|accesibilidad|cableado|cámara|camara/.test(descriptions.toLowerCase())
    ? 'Mantenimiento Preventivo'
    : 'Instalación de CCTV';

  const description = `Generada desde cotización ${quote.quote_number}. Conceptos: ` +
    (descriptions ? descriptions.slice(0, 400) : 'sin detalle');

  const orderNumber = await getNextWorkOrderNumber();

  const { data: order, error: orderError } = await (supabase as any)
    .from('work_orders')
    .insert([{
      order_number: orderNumber,
      customer_id: quote.customer_id,
      sale_id: quoteId,
      service_type: serviceType,
      description,
      address: quote.customers?.address || null,
      contact_name: quote.customers?.contact_person || quote.customers?.full_name || null,
      contact_phone: quote.customers?.phone || null,
      status: 'scheduled',
      priority: 'medium',
      materials_cost: 0,
      labor_cost: quote.total || 0,
      total_cost: quote.total || 0,
    }])
    .select()
    .single();

  if (orderError || !order) throw orderError || new Error('No se pudo crear la orden de trabajo');

  await audit.log(
    'CREATE',
    'work_orders',
    String(order.id),
    `Orden generada desde cotización ${quote.quote_number}: ${order.order_number}`
  );

  return { order, created: true };
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

  const { data: orderResult, error: orderError } = await supabase
    .from('work_orders')
    .insert(orderData)
    .select()
    .single();
  
  if (orderError) throw orderError;

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
    
    if (itemsError) throw itemsError;
  }

  await audit.log(
    'CREATE',
    'work_orders',
    String(orderResult.id),
    `Orden de trabajo creada: ${orderResult.order_number}`
  );

  return orderResult;
}

export async function updateWorkOrder(id: number, order: any) {
  const { data: oldData } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', id)
    .single();

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

  await audit.log(
    'UPDATE',
    'work_orders',
    String(id),
    `Orden de trabajo actualizada: ${data.order_number}`
  );

  return data;
}

export async function deleteWorkOrder(id: number) {
  const { data: oldData } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('work_order_materials').delete().eq('work_order_id', id);
  if (error) throw error;

  const { error: orderError } = await supabase.from('work_orders').delete().eq('id', id);
  if (orderError) throw orderError;

  await audit.log(
    'DELETE',
    'work_orders',
    String(id),
    `Orden de trabajo eliminada: ${oldData?.order_number || 'Desconocida'}`
  );
  
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
