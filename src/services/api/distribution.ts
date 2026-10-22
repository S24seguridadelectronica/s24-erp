import { supabase } from '../supabase/client';

export type DistributionStrategy = 'equal' | 'round_robin' | 'workload' | 'manual' | 'weighted';

export interface SellerConfig {
  id?: number;
  seller_id: string;
  seller_name?: string;
  seller_email?: string;
  is_eligible: boolean;
  is_excluded: boolean;
  exclusion_reason?: string;
  weight_percentage: number;
  round_robin_order: number;
  max_active_leads?: number;
}

export interface DistributionResult {
  strategy: DistributionStrategy;
  total_customers: number;
  assignments: Array<{
    customer_id: number;
    seller_id: string;
    seller_name: string;
  }>;
  summary: Record<string, number>;
}

export async function getEligibleSellers(): Promise<SellerConfig[]> {
  const { data, error } = await supabase
    .from('distribution_config')
    .select(`*, profiles!distribution_config_seller_id_fkey(id, full_name, email, is_active)`)
    .eq('is_eligible', true)
    .eq('is_excluded', false)
    .order('round_robin_order');

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    seller_name: row.profiles?.full_name,
    seller_email: row.profiles?.email
  }));
}

export async function getAllSellerConfigs(): Promise<SellerConfig[]> {
  const { data, error } = await supabase
    .from('distribution_config')
    .select(`*, profiles!distribution_config_seller_id_fkey(id, full_name, email, is_active)`)
    .order('round_robin_order');
  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    seller_name: row.profiles?.full_name,
    seller_email: row.profiles?.email
  }));
}

export async function getSellerWorkload(): Promise<Array<{ seller_id: string; seller_name: string; active_leads_count: number }>> {
  const { data, error } = await supabase.rpc('get_seller_workload');
  if (error) throw error;
  return data || [];
}

export async function updateSellerConfig(sellerId: string, updates: Partial<SellerConfig>) {
  const { data, error } = await supabase
    .from('distribution_config')
    .update(updates)
    .eq('seller_id', sellerId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function distributeEqually(customerIds: number[], sellers: SellerConfig[]): Promise<DistributionResult> {
  if (sellers.length === 0) return { strategy: 'equal', total_customers: customerIds.length, assignments: [], summary: {} };
  const assignments: DistributionResult['assignments'] = [];
  const summary: Record<string, number> = {};
  sellers.forEach(s => summary[s.seller_id] = 0);
  const perSeller = Math.floor(customerIds.length / sellers.length);
  const remainder = customerIds.length % sellers.length;
  let customerIndex = 0;
  sellers.forEach((seller, idx) => {
    const count = perSeller + (idx < remainder ? 1 : 0);
    for (let i = 0; i < count; i++) {
      if (customerIndex < customerIds.length) {
        assignments.push({ customer_id: customerIds[customerIndex], seller_id: seller.seller_id, seller_name: seller.seller_name || 'Desconocido' });
        summary[seller.seller_id]++;
        customerIndex++;
      }
    }
  });
  return { strategy: 'equal', total_customers: customerIds.length, assignments, summary };
}

export async function distributeRoundRobin(customerIds: number[], sellers: SellerConfig[]): Promise<DistributionResult> {
  if (sellers.length === 0) return { strategy: 'round_robin', total_customers: customerIds.length, assignments: [], summary: {} };
  const sortedSellers = [...sellers].sort((a, b) => a.round_robin_order - b.round_robin_order);
  const assignments: DistributionResult['assignments'] = [];
  const summary: Record<string, number> = {};
  sortedSellers.forEach(s => summary[s.seller_id] = 0);
  customerIds.forEach((customerId, idx) => {
    const seller = sortedSellers[idx % sortedSellers.length];
    assignments.push({ customer_id: customerId, seller_id: seller.seller_id, seller_name: seller.seller_name || 'Desconocido' });
    summary[seller.seller_id]++;
  });
  for (let i = 0; i < sortedSellers.length; i++) {
    const newOrder = (sortedSellers[i].round_robin_order + customerIds.length) % sortedSellers.length;
    await supabase.from('distribution_config').update({ round_robin_order: newOrder }).eq('seller_id', sortedSellers[i].seller_id);
  }
  return { strategy: 'round_robin', total_customers: customerIds.length, assignments, summary };
}

export async function distributeByWorkload(customerIds: number[], sellers: SellerConfig[]): Promise<DistributionResult> {
  if (sellers.length === 0) return { strategy: 'workload', total_customers: customerIds.length, assignments: [], summary: {} };
  const workload = await getSellerWorkload();
  const workloadMap = new Map(workload.map(w => [w.seller_id, w.active_leads_count]));
  const sellersWithWorkload = sellers.map(s => ({ ...s, currentWorkload: workloadMap.get(s.seller_id) || 0 }));
  const assignments: DistributionResult['assignments'] = [];
  const summary: Record<string, number> = {};
  sellers.forEach(s => summary[s.seller_id] = 0);
  const sortedSellers = [...sellersWithWorkload].sort((a, b) => a.currentWorkload - b.currentWorkload);
  customerIds.forEach(customerId => {
    const seller = sortedSellers.reduce((min, s) => 
      (summary[s.seller_id] || 0) + s.currentWorkload < (summary[min.seller_id] || 0) + min.currentWorkload ? s : min
    );
    assignments.push({ customer_id: customerId, seller_id: seller.seller_id, seller_name: seller.seller_name || 'Desconocido' });
    summary[seller.seller_id]++;
  });
  return { strategy: 'workload', total_customers: customerIds.length, assignments, summary };
}

export async function distributeManual(assignments: Array<{ customer_id: number; seller_id: string }>): Promise<DistributionResult> {
  const summary: Record<string, number> = {};
  const enrichedAssignments = await Promise.all(
    assignments.map(async (a) => {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', a.seller_id).single();
      summary[a.seller_id] = (summary[a.seller_id] || 0) + 1;
      return { customer_id: a.customer_id, seller_id: a.seller_id, seller_name: profile?.full_name || 'Desconocido' };
    })
  );
  return { strategy: 'manual', total_customers: assignments.length, assignments: enrichedAssignments, summary };
}

export async function distributeWeighted(customerIds: number[], sellers: Array<SellerConfig & { weight_percentage: number }>): Promise<DistributionResult> {
  if (sellers.length === 0) return { strategy: 'weighted', total_customers: customerIds.length, assignments: [], summary: {} };
  const totalWeight = sellers.reduce((sum, s) => sum + s.weight_percentage, 0);
  const assignments: DistributionResult['assignments'] = [];
  const summary: Record<string, number> = {};
  sellers.forEach(s => summary[s.seller_id] = 0);
  let customerIndex = 0;
  sellers.forEach(seller => {
    const count = Math.round((seller.weight_percentage / totalWeight) * customerIds.length);
    for (let i = 0; i < count && customerIndex < customerIds.length; i++) {
      assignments.push({ customer_id: customerIds[customerIndex], seller_id: seller.seller_id, seller_name: seller.seller_name || 'Desconocido' });
      summary[seller.seller_id]++;
      customerIndex++;
    }
  });
  while (customerIndex < customerIds.length) {
    const firstSeller = sellers[0];
    assignments.push({ customer_id: customerIds[customerIndex], seller_id: firstSeller.seller_id, seller_name: firstSeller.seller_name || 'Desconocido' });
    summary[firstSeller.seller_id]++;
    customerIndex++;
  }
  return { strategy: 'weighted', total_customers: customerIds.length, assignments, summary };
}

export async function saveAssignments(
  assignments: DistributionResult['assignments'],
  batchId?: number,
  assignedBy?: string
) {
  const records = assignments.map(a => ({
    customer_id: a.customer_id,
    seller_id: a.seller_id,
    assigned_to: a.seller_id,
    assigned_by: assignedBy || null,
    batch_id: batchId || null,
    assignment_date: new Date().toISOString(),
    strategy: null,
    is_active: true
  }));

  const { error } = await supabase
    .from('customer_assignments')
    .upsert(records, { onConflict: 'customer_id' });

  if (error) throw error;

  // ACTUALIZAR TAMBIÉN EL CAMPO assigned_to EN LA TABLA customers
  for (const assignment of assignments) {
    await (supabase.from('customers') as any)
      .update({ assigned_to: assignment.seller_id })
      .eq('id', assignment.customer_id);
  }

  return true;
}

export async function getAssignments(filters?: { seller_id?: string; batch_id?: number; is_active?: boolean }) {
  let query = supabase
    .from('customer_assignments')
    .select(`*, customers!customer_assignments_customer_id_fkey(full_name, phone, email, city), profiles!customer_assignments_assigned_to_fkey(full_name, email)`)
    .order('assignment_date', { ascending: false });

  if (filters?.seller_id) query = query.eq('assigned_to', filters.seller_id);
  if (filters?.batch_id) query = query.eq('batch_id', filters.batch_id);
  if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function reassignCustomer(customerId: number, newSellerId: string, changedBy: string, reason?: string) {
  const { data: currentAssignment } = await supabase
    .from('customer_assignments')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  await supabase.from('assignment_history').insert({
    customer_id: customerId,
    previous_assigned_to: currentAssignment?.assigned_to || null,
    new_assigned_to: newSellerId,
    changed_by: changedBy,
    change_reason: reason || null,
    changed_at: new Date().toISOString()
  });

  const { error } = await supabase
    .from('customer_assignments')
    .upsert({
      customer_id: customerId,
      assigned_to: newSellerId,
      seller_id: newSellerId,
      assigned_by: changedBy,
      assignment_date: new Date().toISOString(),
      is_active: true
    }, { onConflict: 'customer_id' });

  if (error) throw error;

  // Actualizar también en customers
  await (supabase.from('customers') as any)
    .update({ assigned_to: newSellerId })
    .eq('id', customerId);

  return true;
}

export async function getDistributionStats() {
  const { data: assignments } = await supabase
    .from('customer_assignments')
    .select('assigned_to, is_active')
    .eq('is_active', true);

  const stats: Record<string, number> = {};
  (assignments || []).forEach((a: any) => {
    stats[a.assigned_to] = (stats[a.assigned_to] || 0) + 1;
  });

  const sellerIds = Object.keys(stats);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', sellerIds);

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

  return sellerIds.map(id => ({
    seller_id: id,
    seller_name: profileMap.get(id) || 'Desconocido',
    assigned_count: stats[id]
  }));
}
