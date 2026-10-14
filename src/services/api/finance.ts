import { supabase } from '../supabase/client';

// ============ CUENTAS POR COBRAR ============

export async function getReceivables() {
  const { data, error } = await supabase
    .from('accounts_receivable')
    .select('*, customers(full_name, company_name), quotes(quote_number)')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data as any[];
}

export async function createReceivable(receivable: any) {
  const data = {
    invoice_number: receivable.invoice_number,
    customer_id: receivable.customer_id,
    quote_id: receivable.quote_id || null,
    issue_date: receivable.issue_date,
    due_date: receivable.due_date,
    total_amount: receivable.total_amount,
    paid_amount: receivable.paid_amount || 0,
    status: receivable.status || 'pending',
    notes: receivable.notes || null
  };

  const { data: result, error } = await supabase
    .from('accounts_receivable')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function updateReceivable(id: number, receivable: any) {
  const { data, error } = await supabase
    .from('accounts_receivable')
    .update(receivable)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function recordReceivablePayment(id: number, amount: number, paymentMethod: string, description: string) {
  const receivable = await getReceivableById(id);
  const newPaidAmount = (receivable.paid_amount || 0) + amount;
  let newStatus = 'pending';
  
  if (newPaidAmount >= receivable.total_amount) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partial';
  }

  const { error } = await supabase
    .from('accounts_receivable')
    .update({ paid_amount: newPaidAmount, status: newStatus })
    .eq('id', id);
  
  if (error) throw error;

  // Registrar transacción
  await supabase.from('financial_transactions').insert({
    transaction_type: 'income',
    amount: amount,
    description: `Pago factura ${receivable.invoice_number}: ${description}`,
    reference_type: 'receivable',
    reference_id: id,
    payment_method: paymentMethod,
    customer_id: receivable.customer_id,
    transaction_date: new Date().toISOString().split('T')[0]
  });

  return true;
}

export async function getReceivableById(id: number) {
  const { data, error } = await supabase
    .from('accounts_receivable')
    .select('*, customers(full_name, company_name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReceivable(id: number) {
  const { error } = await supabase.from('accounts_receivable').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============ CUENTAS POR PAGAR ============

export async function getPayables() {
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('*, suppliers(name)')
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data as any[];
}

export async function createPayable(payable: any) {
  const data = {
    bill_number: payable.bill_number,
    supplier_id: payable.supplier_id,
    issue_date: payable.issue_date,
    due_date: payable.due_date,
    total_amount: payable.total_amount,
    paid_amount: payable.paid_amount || 0,
    status: payable.status || 'pending',
    notes: payable.notes || null
  };

  const { data: result, error } = await supabase
    .from('accounts_payable')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function updatePayable(id: number, payable: any) {
  const { data, error } = await supabase
    .from('accounts_payable')
    .update(payable)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function recordPayablePayment(id: number, amount: number, paymentMethod: string, description: string) {
  const payable = await getPayableById(id);
  const newPaidAmount = (payable.paid_amount || 0) + amount;
  let newStatus = 'pending';
  
  if (newPaidAmount >= payable.total_amount) {
    newStatus = 'paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'partial';
  }

  const { error } = await supabase
    .from('accounts_payable')
    .update({ paid_amount: newPaidAmount, status: newStatus })
    .eq('id', id);
  
  if (error) throw error;

  await supabase.from('financial_transactions').insert({
    transaction_type: 'expense',
    amount: amount,
    description: `Pago factura ${payable.bill_number}: ${description}`,
    reference_type: 'payable',
    reference_id: id,
    payment_method: paymentMethod,
    transaction_date: new Date().toISOString().split('T')[0]
  });

  return true;
}

export async function getPayableById(id: number) {
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('*, suppliers(name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function deletePayable(id: number) {
  const { error } = await supabase.from('accounts_payable').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============ TRANSACCIONES ============

export async function getTransactions() {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*, customers(full_name)')
    .order('transaction_date', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function createTransaction(transaction: any) {
  const data = {
    transaction_type: transaction.transaction_type,
    amount: transaction.amount,
    currency: transaction.currency || 'COP',
    description: transaction.description || null,
    reference_type: transaction.reference_type || null,
    reference_id: transaction.reference_id || null,
    payment_method: transaction.payment_method || null,
    customer_id: transaction.customer_id || null,
    transaction_date: transaction.transaction_date
  };

  const { data: result, error } = await supabase
    .from('financial_transactions')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function deleteTransaction(id: number) {
  const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============ RESUMEN FINANCIERO ============

export async function getFinanceSummary() {
  const { data: receivables } = await supabase.from('accounts_receivable').select('total_amount, paid_amount, status');
  const { data: payables } = await supabase.from('accounts_payable').select('total_amount, paid_amount, status');
  const { data: transactions } = await supabase.from('financial_transactions').select('transaction_type, amount');

  const totalReceivable = (receivables || []).reduce((sum: number, r: any) => sum + (r.total_amount - r.paid_amount), 0);
  const totalPayable = (payables || []).reduce((sum: number, p: any) => sum + (p.total_amount - p.paid_amount), 0);
  
  const totalIncome = (transactions || [])
    .filter((t: any) => t.transaction_type === 'income' || t.transaction_type === 'payment')
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  
  const totalExpense = (transactions || [])
    .filter((t: any) => t.transaction_type === 'expense' || t.transaction_type === 'refund')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  return {
    totalReceivable,
    totalPayable,
    totalIncome,
    totalExpense,
    cashFlow: totalIncome - totalExpense,
    overdueReceivables: (receivables || []).filter((r: any) => r.status === 'overdue').length,
    overduePayables: (payables || []).filter((p: any) => p.status === 'overdue').length
  };
}

export async function getNextInvoiceNumber() {
  const { data, error } = await supabase
    .from('accounts_receivable')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].invoice_number.replace('FAC-', ''));
    return `FAC-${String(lastNumber + 1).padStart(4, '0')}`;
  }
  return 'FAC-0001';
}

export async function getNextBillNumber() {
  const { data, error } = await supabase
    .from('accounts_payable')
    .select('bill_number')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) throw error;
  
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].bill_number.replace('FACT-PROV-', ''));
    return `FACT-PROV-${String(lastNumber + 1).padStart(4, '0')}`;
  }
  return 'FACT-PROV-0001';
}
