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
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customers(full_name, company_name), opportunities(title)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function getQuoteById(id: number) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, items(*), customers(full_name, company_name, email, phone, address, city)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as any;
}

export async function createQuote(quote: any, items: Omit<QuoteItem, 'id' | 'quote_id'>[]) {
  const quoteData = {
    quote_number: quote.quote_number,
    customer_id: quote.customer_id,
    opportunity_id: quote.opportunity_id || null,
    salesperson_id: quote.salesperson_id || null,
    status: quote.status,
    subtotal: quote.subtotal || 0,
    tax_amount: quote.tax_amount || 0,
    discount_amount: quote.discount_amount || 0,
    total: quote.total || 0,
    valid_until: quote.valid_until,
    terms: quote.terms || null,
    notes: quote.notes || null
  };

  const { data: quoteData_result, error: quoteError } = await supabase
    .from('quotes')
    .insert(quoteData)
    .select()
    .single();
  
  if (quoteError) throw quoteError;

  if (items.length > 0) {
    const itemsWithQuoteId = items.map(item => ({
      quote_id: quoteData_result.id,
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      tax_rate: item.tax_rate || 19,
      total: (item.quantity * item.unit_price) * (1 - (item.discount || 0) / 100) * (1 + (item.tax_rate || 19) / 100)
    }));

    const { error: itemsError } = await supabase
      .from('quote_items')
      .insert(itemsWithQuoteId);
    
    if (itemsError) throw itemsError;
  }

  await audit.log(
    'quotes',
    String(quoteData_result.id),
    quoteData_result,
    `Cotización creada: ${quoteData_result.quote_number}`
  );

  return quoteData_result;
}

export async function updateQuote(id: number, quote: any) {
  const { data: oldData, error: fetchError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // CORRECCIÓN: Preservar valores anteriores si no se envían nuevos
  const quoteData: any = {
    ...oldData,
    ...quote,
    subtotal: quote.subtotal !== undefined ? quote.subtotal : oldData.subtotal,
    tax_amount: quote.tax_amount !== undefined ? quote.tax_amount : oldData.tax_amount,
    discount_amount: quote.discount_amount !== undefined ? quote.discount_amount : oldData.discount_amount,
    total: quote.total !== undefined ? quote.total : oldData.total,
  };

  const { data, error } = await supabase
    .from('quotes')
    .update(quoteData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;

  await audit.log(
    'quotes',
    String(id),
    oldData,
    data,
    `Cotización actualizada: ${data.quote_number}`
  );

  return data;
}

export async function deleteQuote(id: number) {
  const { data: oldData } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('quote_items').delete().eq('quote_id', id);
  if (error) throw error;

  const { error: quoteError } = await supabase.from('quotes').delete().eq('id', id);
  if (quoteError) throw quoteError;

  await audit.delete(
    'quotes',
    String(id),
    oldData,
    `Cotización eliminada: ${oldData?.quote_number || 'Desconocida'}`
  );
  
  return true;
}

export async function getNextQuoteNumber() {
  const { data, error } = await supabase
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





