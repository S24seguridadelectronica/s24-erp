import { supabase } from '../supabase/client';
import { audit } from './audit';

export interface QuoteItem {
  id?: number;
  quote_id?: number;
  item_type: 'product' | 'service';
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  total?: number;
}

export interface Quote {
  id?: number;
  quote_number: string;
  customer_id: number;
  opportunity_id?: number;
  salesperson_id?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  valid_until: string;
  terms?: string;
  notes?: string;
  items?: QuoteItem[];
  created_at?: string;
  updated_at?: string;
}

export async function getQuotes() {
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Iniciamos la consulta base
  let query = (supabase as any)
    .from('quotes')
    .select('*, customers(full_name, company_name), opportunities(title)')
    .order('created_at', { ascending: false });

  // 2. Validamos el rol del usuario
  if (user) {
    const { data: roleData } = await (supabase as any)
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    const roleName = roleData?.roles?.name?.toLowerCase().trim() || '';

    // 3. Si es vendedor de campo, SOLO traemos sus cotizaciones
    if (roleName === 'vendedor_campo' || roleName === 'field_sales' || roleName === 'cerrador') {
      query = query.eq('salesperson_id', user.id);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getQuoteById(id: number) {
  const { data, error } = await (supabase as any)
    .from('quotes')
    .select('*, items(*), customers(full_name, company_name, email, phone, address, city)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createQuote(quote: any, items: any[]) {
  const { data: { user } } = await supabase.auth.getUser();

  const quoteData: any = {
    quote_number: quote.quote_number,
    customer_id: quote.customer_id,
    opportunity_id: quote.opportunity_id || null,
    salesperson_id: quote.salesperson_id || user?.id || null,
    status: quote.status,
    subtotal: quote.subtotal || 0,
    tax_amount: quote.tax_amount || 0,
    discount_amount: quote.discount_amount || 0,
    total: quote.total || 0,
    valid_until: quote.valid_until,
    terms: quote.terms || null,
    notes: quote.notes || null
  };

  const { data: quoteData_result, error: quoteError } = await (supabase as any)
    .from('quotes')
    .insert([quoteData])
    .select()
    .single();
  
  if (quoteError || !quoteData_result) throw quoteError || new Error("No se pudo crear la cotización");

  if (items && items.length > 0) {
    const itemsWithQuoteId: any[] = items.map((item: any) => ({
      quote_id: quoteData_result.id,
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      tax_rate: item.tax_rate || 19,
      total: (item.quantity * item.unit_price) * (1 - (item.discount || 0) / 100) * (1 + (item.tax_rate || 19) / 100)
    }));

    const { error: itemsError } = await (supabase as any)
      .from('quote_items')
      .insert(itemsWithQuoteId);
    
    if (itemsError) throw itemsError;
  }

  await audit.log(
    'CREATE',
    'quotes',
    String(quoteData_result.id),
    `Cotización creada: ${quoteData_result.quote_number}`
  );

  return quoteData_result;
}

export async function updateQuote(id: number, quote: any) {
  const { data: oldData, error: fetchError } = await (supabase as any)
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !oldData) throw fetchError || new Error("No se encontró la cotización");

  const { items, ...quoteData } = quote;

  const updatePayload: any = {
    ...oldData,
    ...quoteData,
    subtotal: quoteData.subtotal !== undefined ? quoteData.subtotal : oldData.subtotal,
    tax_amount: quoteData.tax_amount !== undefined ? quoteData.tax_amount : oldData.tax_amount,
    discount_amount: quoteData.discount_amount !== undefined ? quoteData.discount_amount : oldData.discount_amount,
    total: quoteData.total !== undefined ? quoteData.total : oldData.total,
  };

  const { data, error } = await (supabase as any)
    .from('quotes')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  
  if (error || !data) throw error || new Error("No se pudo actualizar la cotización");

  if (items && Array.isArray(items)) {
    const { error: deleteItemsError } = await (supabase as any)
      .from('quote_items')
      .delete()
      .eq('quote_id', id);
    
    if (deleteItemsError) throw deleteItemsError;

    if (items.length > 0) {
      const itemsWithQuoteId: any[] = items.map((item: any) => ({
        quote_id: id,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        tax_rate: item.tax_rate || 19,
        total: (item.quantity * item.unit_price) * (1 - (item.discount || 0) / 100) * (1 + (item.tax_rate || 19) / 100)
      }));

      const { error: insertItemsError } = await (supabase as any)
        .from('quote_items')
        .insert(itemsWithQuoteId);
      
      if (insertItemsError) throw insertItemsError;
    }
  }

  await audit.log(
    'UPDATE',
    'quotes',
    String(id),
    `Cotización actualizada: ${data.quote_number}`
  );

  return data;
}

export async function deleteQuote(id: number) {
  const { data: oldData } = await (supabase as any)
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await (supabase as any).from('quote_items').delete().eq('quote_id', id);
  if (error) throw error;

  const { error: quoteError } = await (supabase as any).from('quotes').delete().eq('id', id);
  if (quoteError) throw quoteError;

  await audit.log(
    'DELETE',
    'quotes',
    String(id),
    `Cotización eliminada: ${oldData?.quote_number || 'Desconocida'}`
  );
  
  return true;
}

export async function getNextQuoteNumber() {
  const { data, error } = await (supabase as any)
    .from('quotes')
    .select('quote_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].quote_number.replace('COT-', ''));
    return `COT-${String(lastNumber + 1).padStart(3, '0')}`;
  }
  
  return 'COT-001';
}

// 👇 FUNCIÓN NUEVA AGREGADA AQUÍ 👇
export async function convertQuoteToInvoice(quoteId: number, quoteData: any, paymentMethod: string) {
  const invoiceData = {
    customer_id: quoteData.customer_id,
    quote_id: quoteId,
    issue_date: new Date().toISOString(),
    due_date: quoteData.valid_until || new Date().toISOString(),
    total_amount: quoteData.total,
    paid_amount: 0,
    status: 'pending',
    payment_method: paymentMethod, // Guarda si es Efectivo o Transferencia
    notes: `Factura generada desde cotización ${quoteData.quote_number}`
  };

  // 1. Crear la factura en Cuentas por Cobrar
  const { data: invoiceResult, error: invoiceError } = await (supabase as any)
    .from('accounts_receivable')
    .insert([invoiceData])
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // 2. Cambiar el estado de la cotización a 'converted' (Facturada)
  const { error: quoteError } = await (supabase as any)
    .from('quotes')
    .update({ status: 'converted' })
    .eq('id', quoteId);

  if (quoteError) throw quoteError;

  await audit.log(
    'UPDATE',
    'quotes',
    String(quoteId),
    `Cotización convertida a factura: ${quoteData.quote_number} - Método: ${paymentMethod}`
  );

  return invoiceResult;
}