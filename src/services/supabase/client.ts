import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validación de seguridad: Si faltan las variables, avisa de inmediato.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR CRÍTICO: Faltan las variables de entorno de Supabase.");
  console.error("Asegúrate de tener el archivo .env o de haber configurado las GitHub Secrets.");
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://error-falta-env.supabase.co', 
  supabaseAnonKey || 'error-falta-env', 
  {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  }
)