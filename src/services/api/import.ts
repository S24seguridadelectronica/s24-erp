import { supabase } from '../supabase/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRecord {
  rowNumber: number;
  rawData: Record<string, any>;
  mappedData: Record<string, any>;
  valid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicate?: boolean;
  duplicateType?: string;
  duplicateOf?: number;
  existsInCRM?: boolean;
}

export interface ImportConfig {
  duplicateStrategy: 'skip' | 'update' | 'import_all';
  autoAssign: boolean;
  distributionStrategy?: 'equal' | 'round_robin' | 'workload' | 'manual';
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  nombre: ['nombre', 'name', 'nombres', 'first_name', 'firstname'],
  apellido: ['apellido', 'last_name', 'lastname', 'apellidos', 'surnames'],
  empresa: ['empresa', 'company', 'company_name', 'compania', 'compañia', 'razon_social'],
  telefono: ['telefono', 'teléfono', 'phone', 'tel', 'celular', 'cel', 'movil', 'móvil'],
  telefono_secundario: ['telefono_secundario', 'teléfono secundario', 'phone_secondary', 'tel2', 'telefono2'],
  correo: ['correo', 'email', 'e-mail', 'correo_electronico', 'correo electrónico', 'mail'],
  ciudad: ['ciudad', 'city', 'municipio'],
  departamento: ['departamento', 'department', 'estado', 'state', 'provincia'],
  direccion: ['direccion', 'dirección', 'address', 'dir', 'direccion_completa'],
  tipo_cliente: ['tipo_cliente', 'tipo', 'customer_type', 'tipo de cliente'],
  origen: ['origen', 'source', 'lead_source', 'fuente', 'canal'],
  observaciones: ['observaciones', 'notes', 'notas', 'comentarios', 'comments', 'descripcion']
};

export async function parseFile(file: File): Promise<Record<string, any>[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') return parseCSV(file);
  if (extension === 'json') return parseJSON(file);
  if (extension === 'xlsx' || extension === 'xls') return parseXLSX(file);
  throw new Error(`Formato no soportado: ${extension}. Use CSV, JSON o XLSX.`);
}

function parseCSV(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true, encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`Error al leer CSV: ${results.errors[0].message}`));
        } else {
          resolve(results.data as Record<string, any>[]);
        }
      },
      error: (error) => reject(new Error(`Error al parsear CSV: ${error.message}`))
    });
  });
}

function parseJSON(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(Array.isArray(data) ? data : (data.data || data.records || [data]));
      } catch (err) { reject(new Error(`JSON inválido: ${(err as Error).message}`)); }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsText(file);
  });
}

function parseXLSX(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as Record<string, any>[]);
      } catch (err) { reject(new Error(`Error al leer Excel: ${(err as Error).message}`)); }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function detectColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  Object.entries(COLUMN_MAPPINGS).forEach(([standardName, variations]) => {
    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim().replace(/\s+/g, '_');
      if (variations.some(v => normalizedHeader === v.toLowerCase().replace(/\s+/g, '_') || normalizedHeader.includes(v.toLowerCase().replace(/\s+/g, '_')))) {
        if (!usedHeaders.has(header)) {
          mapping[standardName] = header;
          usedHeaders.add(header);
          break;
        }
      }
    }
  });
  return mapping;
}

export function getUnrecognizedColumns(headers: string[], mapping: Record<string, string>): string[] {
  const mappedHeaders = new Set(Object.values(mapping));
  return headers.filter(h => !mappedHeaders.has(h));
}

export function validateRecord(record: Record<string, any>, mapping: Record<string, string>): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nombre = record[mapping.nombre]?.toString().trim();
  const telefono = record[mapping.telefono]?.toString().trim();
  const correo = record[mapping.correo]?.toString().trim();

  if (!nombre) errors.push('El nombre es obligatorio');
  else if (nombre.length < 2) errors.push('El nombre debe tener al menos 2 caracteres');
  if (!telefono && !correo) errors.push('Se requiere al menos un medio de contacto');
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errors.push('Formato de correo electrónico inválido');
  if (telefono) {
    const digits = telefono.replace(/\D/g, '');
    if (digits.length < 7) warnings.push('Teléfono parece incompleto');
    else if (digits.length > 15) warnings.push('Teléfono demasiado largo');
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function normalizePhone(phone: string): string { return phone ? phone.replace(/\D/g, '') : ''; }
export function normalizeEmail(email: string): string { return email ? email.toLowerCase().trim() : ''; }

export async function checkDuplicates(records: ParsedRecord[], mapping: Record<string, string>): Promise<ParsedRecord[]> {
  const { data: existingCustomers } = await (supabase.from('customers') as any).select('id, full_name, phone, email, company_name').limit(10000);
  const existingPhones = new Map<string, number>();
  const existingEmails = new Map<string, number>();
  existingCustomers?.forEach((c: any) => {
    if (c.phone) existingPhones.set(normalizePhone(c.phone), c.id);
    if (c.email) existingEmails.set(normalizeEmail(c.email), c.id);
  });
  const seenPhones = new Map<string, number>();
  const seenEmails = new Map<string, number>();

  return records.map(record => {
    const phone = normalizePhone(record.mappedData[mapping.telefono] || '');
    const email = normalizeEmail(record.mappedData[mapping.correo] || '');
    let isDuplicate = false, duplicateType = '', duplicateOf: number | undefined, existsInCRM = false;

    if (phone && seenPhones.has(phone)) { isDuplicate = true; duplicateType = 'Teléfono duplicado en archivo'; duplicateOf = seenPhones.get(phone); }
    else if (phone) seenPhones.set(phone, record.rowNumber);

    if (!isDuplicate && email && seenEmails.has(email)) { isDuplicate = true; duplicateType = 'Correo duplicado en archivo'; duplicateOf = seenEmails.get(email); }
    else if (email) seenEmails.set(email, record.rowNumber);

    if (!isDuplicate && phone && existingPhones.has(phone)) { isDuplicate = true; duplicateType = 'Teléfono ya existe en CRM'; duplicateOf = existingPhones.get(phone); existsInCRM = true; }
    if (!isDuplicate && email && existingEmails.has(email)) { isDuplicate = true; duplicateType = 'Correo ya existe en CRM'; duplicateOf = existingEmails.get(email); existsInCRM = true; }

    return { ...record, isDuplicate, duplicateType, duplicateOf, existsInCRM };
  });
}

export async function executeImport(
  records: ParsedRecord[],
  mapping: Record<string, string>,
  config: ImportConfig,
  batchId: number
): Promise<{ imported: number; updated: number; skipped: number; errors: number; errorDetails: string[] }> {
  let imported = 0, updated = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];

  console.log('🚀 Iniciando importación para lote:', batchId);
  console.log('📋 Total de registros:', records.length);
  console.log('⚙️ Configuración:', config);

  for (const record of records) {
    try {
      if (!record.valid) {
        skipped++;
        await saveBatchResult(batchId, record, 'error', record.errors.join('; '), null);
        errorDetails.push(`Fila ${record.rowNumber}: ${record.errors.join('; ')}`);
        continue;
      }

      if (record.isDuplicate) {
        if (config.duplicateStrategy === 'skip') {
          skipped++;
          await saveBatchResult(batchId, record, 'skipped', record.duplicateType || 'Duplicado', null);
          continue;
        }
        if (config.duplicateStrategy === 'update' && record.existsInCRM && record.duplicateOf) {
          await updateExistingCustomer(record.duplicateOf, record.mappedData, mapping);
          updated++;
          await saveBatchResult(batchId, record, 'updated', `Actualizado: ${record.duplicateType}`, record.duplicateOf);
          continue;
        }
        skipped++;
        await saveBatchResult(batchId, record, 'skipped', record.duplicateType || 'Duplicado', null);
        continue;
      }

      console.log(`✅ Fila ${record.rowNumber} válida, creando cliente...`);
      const customerId = await createCustomerFromRecord(record.mappedData, mapping);
      console.log(`✅ Cliente creado con ID:`, customerId);
      
      imported++;
      await saveBatchResult(batchId, record, 'imported', 'Cliente creado exitosamente', customerId);
    } catch (err: any) {
      errors++;
      const errorMsg = err.message || 'Error desconocido';
      console.error(`❌ Error en fila ${record.rowNumber}:`, errorMsg);
      errorDetails.push(`Fila ${record.rowNumber}: ${errorMsg}`);
      await saveBatchResult(batchId, record, 'error', errorMsg, null);
    }
  }

  console.log('\n📊 Resumen de importación:', { imported, updated, skipped, errors });
  return { imported, updated, skipped, errors, errorDetails };
}

async function createCustomerFromRecord(data: Record<string, any>, mapping: Record<string, string>): Promise<number> {
  const full_name = `${data[mapping.nombre] || ''} ${data[mapping.apellido] || ''}`.trim();
  
  const { data: inserted, error } = await (supabase.from('customers') as any)
    .insert({
      full_name,
      company_name: data[mapping.empresa] || null,
      customer_type: data[mapping.tipo_cliente] === 'Empresa' ? 'company' : 'individual',
      document_number: '',
      phone: data[mapping.telefono] || null,
      email: data[mapping.correo] || null,
      city: data[mapping.ciudad] || null,
      address: data[mapping.direccion] || null,
      contact_person: full_name,
      source: data[mapping.origen] || 'Importación Masiva',
      notes: data[mapping.observaciones] || null,
      department: data[mapping.departamento] || null
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Error de Supabase al insertar cliente:', error);
    throw new Error(error.message || 'Error al crear cliente en la base de datos');
  }

  return inserted.id;
}

async function updateExistingCustomer(customerId: number, data: Record<string, any>, mapping: Record<string, string>) {
  const updateData: any = {};
  if (data[mapping.nombre]) updateData.full_name = `${data[mapping.nombre]} ${data[mapping.apellido] || ''}`.trim();
  if (data[mapping.empresa]) updateData.company_name = data[mapping.empresa];
  if (data[mapping.telefono]) updateData.phone = data[mapping.telefono];
  if (data[mapping.correo]) updateData.email = data[mapping.correo];
  if (data[mapping.ciudad]) updateData.city = data[mapping.ciudad];
  if (data[mapping.departamento]) updateData.department = data[mapping.departamento];
  if (data[mapping.direccion]) updateData.address = data[mapping.direccion];

  const { error } = await (supabase.from('customers') as any).update(updateData).eq('id', customerId);
  if (error) throw error;
}

async function saveBatchResult(batchId: number, record: ParsedRecord, status: string, message?: string, customerId?: number | null) {
  await (supabase.from('batch_results') as any).insert({
    batch_id: batchId,
    row_number: record.rowNumber,
    status,
    raw_data: record.rawData,
    parsed_data: record.mappedData,
    customer_id: customerId || null,
    error_message: message || null,
    error_type: record.errors.length > 0 ? 'validation' : (record.isDuplicate ? 'duplicate' : null)
  });
}

export async function createImportBatch(filename: string, totalRows: number) {
  const { data: lastBatch } = await (supabase.from('import_batches') as any)
    .select('batch_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let batchNumber = 'IMP-0001';
  if (lastBatch?.batch_number) {
    const num = parseInt(lastBatch.batch_number.replace('IMP-', '')) + 1;
    batchNumber = `IMP-${num.toString().padStart(4, '0')}`;
  }

  const { data, error } = await (supabase.from('import_batches') as any)
    .insert({
      batch_number: batchNumber,
      original_filename: filename,
      file_format: filename.split('.').pop()?.toLowerCase() || 'csv',
      total_rows: totalRows,
      status: 'processing',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function finalizeBatch(batchId: number, summary: any) {
  const status = summary.errors > 0 ? 'completed_with_warnings' : 'completed';
  await (supabase.from('import_batches') as any).update({
    status,
    valid_rows: summary.imported + summary.updated,
    error_rows: summary.errors,
    duplicate_rows: summary.skipped,
    updated_rows: summary.updated,
    completed_at: new Date().toISOString()
  }).eq('id', batchId);
}

export function downloadTemplate() {
  const headers = ['nombre', 'apellido', 'empresa', 'telefono', 'correo', 'ciudad', 'departamento', 'direccion', 'tipo_cliente', 'origen', 'observaciones'];
  const sampleData = [
    ['Juan', 'Pérez', 'Seguridad SAS', '3001234567', 'juan@empresa.com', 'Bucaramanga', 'Santander', 'Calle 123', 'Individual', 'Web', 'Interesado'],
    ['María', 'López', '', '3107654321', 'maria@gmail.com', 'Bogotá', 'Cundinamarca', 'Cra 10', 'Individual', 'Facebook', 'Alarma']
  ];
  const csvContent = [headers.join(','), ...sampleData.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'plantilla_clientes_s24.csv';
  link.click();
}

export async function getImportHistory() {
  const { data, error } = await (supabase.from('import_batches') as any).select('*, profiles(full_name, email)').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBatchResults(batchId: number) {
  const { data, error } = await (supabase.from('batch_results') as any).select('*').eq('batch_id', batchId).order('row_number');
  if (error) throw error;
  return data || [];
}
