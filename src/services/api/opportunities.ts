import { supabase } from '../supabase/client';

export interface Opportunity {
  id?: number;
  customer_id: number;
  title: string;
  stage: string;
  value: number;
  probability: number;
  expected_close_date: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export async function getOpportunities() {
  const { data, error } = await supabase.from('opportunities').select('*, customers(full_name, company_name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function createOpportunity(opp: Omit<Opportunity, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('opportunities').insert(opp).select().single();
  if (error) throw error;
  return data as Opportunity;
}

export async function updateOpportunity(id: number, opp: Partial<Opportunity>) {
  const { data, error } = await supabase.from('opportunities').update(opp).eq('id', id).select().single();
  if (error) throw error;
  return data as Opportunity;
}
