import { supabase } from '../supabase/client';
import { audit } from './audit';

export interface Opportunity {
  id?: number;
  customer_id: number;
  seller_id?: string;
  title: string;
  stage: string;
  value: number;
  probability: number;
  expected_close_date: string;
  contact_log?: string;
  technical_survey?: string;
  loss_reason?: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export async function getOpportunities(sellerId?: string, customerId?: number) {
  let query = (supabase.from('opportunities') as any).select('*, customers(full_name, company_name)');
  
  if (sellerId) {
    query = query.eq('seller_id', sellerId);
  }
  
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createOpportunity(opp: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await (supabase.from('opportunities') as any)
    .insert(opp as any)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo crear la oportunidad');

  await audit.log('CREATE', 'opportunities', String(data.id), `Oportunidad creada: ${data.title}`);

  return data as Opportunity;
}

export async function updateOpportunity(id: number, opp: Partial<Opportunity>) {
  const { data: oldData } = await (supabase.from('opportunities') as any)
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await (supabase.from('opportunities') as any)
    .update(opp as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar la oportunidad');

  await audit.log('UPDATE', 'opportunities', String(id), `Oportunidad actualizada: ${data.title}`);

  return data as Opportunity;
}
