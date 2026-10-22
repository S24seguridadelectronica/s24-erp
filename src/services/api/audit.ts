import { supabase } from '../supabase/client';

export const audit = {
  log: async (action: string, table: string, recordId: string, description: string) => {
    console.log(`🚀 AUDIT TRIGGERED: [${action}] en tabla [${table}] - ${description}`);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log(' Usuario:', user?.email);

      // Llamar la función RPC con los parámetros en el orden correcto
      const { data, error } = await supabase.rpc('insert_audit_log', {
        p_action: action,
        p_table_name: table,
        p_user_id: user?.id || null,
        p_user_email: user?.email || null,
        p_user_name: user?.user_metadata?.full_name || user?.email || 'Sistema',
        p_record_id: String(recordId),
        p_description: description
      });

      if (error) {
        console.error('❌ AUDIT FALLÓ:', error.message);
        console.error('Detalles:', error.details);
      } else {
        console.log('✅ AUDIT EXITOSO');
      }
    } catch (err) {
      console.error('❌ EXCEPCIÓN EN AUDITORÍA:', err);
    }
  }
};

export async function getAuditLogs(filters?: {
  user_name?: string;
  table_name?: string;
  action?: string;
}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.table_name) query = query.eq('table_name', filters.table_name);
  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.user_name) query = query.ilike('user_name', `%${filters.user_name}%`);

  const { data, error } = await query.limit(500);

  if (error) {
    console.error('❌ Error al obtener logs:', error);
    throw error;
  }
  
  return data || [];
}
