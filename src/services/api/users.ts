import { supabase } from '../supabase/client';

export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, is_active, created_at');
  if (error) throw error;
  return data;
}