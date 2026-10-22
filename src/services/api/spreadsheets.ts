import { supabase } from '../supabase/client';

export interface Spreadsheet {
  id?: number;
  name: string;
  description?: string;
  created_by?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SpreadsheetRow {
  id?: number;
  spreadsheet_id: number;
  row_number: number;
  data: any;
  created_at?: string;
}

// Obtener todas las hojas
export async function getSpreadsheets() {
  const { data, error } = await supabase
    .from('spreadsheets')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Crear nueva hoja
export async function createSpreadsheet(spreadsheet: Omit<Spreadsheet, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('spreadsheets')
    .insert(spreadsheet)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Eliminar hoja
export async function deleteSpreadsheet(id: number) {
  const { error } = await supabase.from('spreadsheets').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Obtener filas de una hoja
export async function getSpreadsheetRows(spreadsheetId: number) {
  const { data, error } = await supabase
    .from('spreadsheet_rows')
    .select('*')
    .eq('spreadsheet_id', spreadsheetId)
    .order('row_number');
  
  if (error) throw error;
  return data || [];
}

// Guardar filas de una hoja
export async function saveSpreadsheetRows(spreadsheetId: number, rows: any[]) {
  // Eliminar filas existentes
  await supabase.from('spreadsheet_rows').delete().eq('spreadsheet_id', spreadsheetId);
  
  // Insertar nuevas filas
  if (rows.length > 0) {
    const rowsToInsert = rows.map((row, index) => ({
      spreadsheet_id: spreadsheetId,
      row_number: index + 1,
      data: row
    }));
    
    const { error } = await supabase
      .from('spreadsheet_rows')
      .insert(rowsToInsert);
    
    if (error) throw error;
  }
  
  return true;
}
