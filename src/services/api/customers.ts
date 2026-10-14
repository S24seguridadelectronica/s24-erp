import { supabase } from '../supabase/client';

export interface Customer {
  id?: number;
  customer_type: 'individual' | 'company';
  document_number: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  contact_person: string;
  source: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(id: number, customer: Partial<Customer>) {
  const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select().single();
  if (error) throw error;
  return data as Customer;
}

export async function deleteCustomer(id: number) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
  return true;
}
