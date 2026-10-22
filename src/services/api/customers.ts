import { supabase } from '../supabase/client';
import { audit } from './audit';

export interface Customer {
  id?: number;
  customer_type: 'individual' | 'company';
  document_number: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  whatsapp_phone?: string;
  address: string;
  city: string;
  contact_person: string;
  source: string;
  notes: string;
  assigned_to?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getCustomers(sellerId?: string) {
  console.log('🔍 [API getCustomers] sellerId recibido:', sellerId);
  
  let query = (supabase.from('customers') as any).select('*');

  if (sellerId) {
    console.log('🔒 [API getCustomers] Aplicando filtro estricto: assigned_to =', sellerId);
    query = query.eq('assigned_to', sellerId);
  } else {
    console.log(' [API getCustomers] SIN FILTRO (Modo Administrador o rol no detectado)');
  }

  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ [API getCustomers] Error de Supabase:', error);
    throw error;
  }
  
  console.log('✅ [API getCustomers] Registros devueltos:', data?.length || 0);
  return data as Customer[];
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const { data: { user } } = await supabase.auth.getUser();
  console.log(' API createCustomer - Usuario actual:', user?.id);
  const customerWithAssignment = { ...customer, assigned_to: user?.id || customer.assigned_to };
  console.log(' API createCustomer - Enviando con assigned_to:', customerWithAssignment.assigned_to);
  const { data, error } = await (supabase.from('customers') as any).insert(customerWithAssignment as any).select().single();
  if (error) throw error;
  await audit.log('CREATE', 'customers', String(data?.id), `Cliente creado: ${data?.full_name}`);
  return data as Customer;
}

export async function updateCustomer(id: number, customer: Partial<Customer>) {
  const { data, error } = await (supabase.from('customers') as any).update(customer as any).eq('id', id).select().single();
  if (error) throw error;
  await audit.log('UPDATE', 'customers', String(id), `Cliente actualizado: ${data?.full_name || id}`);
  return data as Customer;
}

export async function deleteCustomer(id: number) {
  const { data: oldData } = await (supabase.from('customers') as any).select('*').eq('id', id).single();
  const { error } = await (supabase.from('customers') as any).delete().eq('id', id);
  if (error) throw error;
  await audit.log('DELETE', 'customers', String(id), `Cliente eliminado: ${oldData?.full_name || id}`);
  return true;
}

