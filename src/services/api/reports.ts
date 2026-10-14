import { supabase } from '../supabase/client';

// ============ RESUMEN GENERAL ============

export async function getExecutiveSummary() {
  const { data: customers } = await supabase.from('customers').select('id');
  const { data: opportunities } = await supabase.from('opportunities').select('value, stage');
  const { data: quotes } = await supabase.from('quotes').select('total, status');
  const { data: workOrders } = await supabase.from('work_orders').select('total_cost, status');
  const { data: products } = await supabase.from('products').select('stock_quantity, price, cost, min_stock');
  const { data: receivables } = await supabase.from('accounts_receivable').select('total_amount, paid_amount, status');
  const { data: payables } = await supabase.from('accounts_payable').select('total_amount, paid_amount, status');
  const { data: transactions } = await supabase.from('financial_transactions').select('transaction_type, amount, transaction_date');

  const totalCustomers = customers?.length || 0;
  const totalOpportunities = opportunities?.length || 0;
  const pipelineValue = opportunities?.reduce((sum, o) => sum + (o.value || 0), 0) || 0;
  const wonQuotes = quotes?.filter(q => q.status === 'approved' || q.status === 'converted') || [];
  const salesRevenue = wonQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
  
  const completedOrders = workOrders?.filter(o => o.status === 'completed') || [];
  const pendingOrders = workOrders?.filter(o => o.status !== 'completed' && o.status !== 'cancelled') || [];
  
  const inventoryValue = products?.reduce((sum, p) => sum + (p.stock_quantity * p.cost), 0) || 0;
  const lowStockProducts = products?.filter(p => p.stock_quantity <= p.min_stock) || [];
  
  const totalReceivable = receivables?.reduce((sum, r) => sum + ((r.total_amount || 0) - (r.paid_amount || 0)), 0) || 0;
  const totalPayable = payables?.reduce((sum, p) => sum + ((p.total_amount || 0) - (p.paid_amount || 0)), 0) || 0;
  
  const totalIncome = transactions?.filter(t => t.transaction_type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const totalExpense = transactions?.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  return {
    totalCustomers,
    totalOpportunities,
    pipelineValue,
    salesRevenue,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    inventoryValue,
    lowStockProducts: lowStockProducts.length,
    totalReceivable,
    totalPayable,
    totalIncome,
    totalExpense,
    cashFlow: totalIncome - totalExpense,
  };
}

// ============ REPORTE DE VENTAS ============

export async function getSalesReport(startDate?: string, endDate?: string) {
  let query = supabase
    .from('quotes')
    .select('*, customers(full_name)')
    .order('created_at', { ascending: false });

  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const quotes = data || [];
  const byStatus = quotes.reduce((acc: any, q: any) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {});

  const totalByStatus = quotes.reduce((acc: any, q: any) => {
    acc[q.status] = (acc[q.status] || 0) + (q.total || 0);
    return acc;
  }, {});

  const topCustomers = quotes
    .filter(q => q.status === 'approved' || q.status === 'converted')
    .reduce((acc: any, q: any) => {
      const name = q.customers?.full_name || 'Desconocido';
      acc[name] = (acc[name] || 0) + (q.total || 0);
      return acc;
    }, {});

  const sortedTopCustomers = Object.entries(topCustomers)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  return {
    quotes,
    byStatus,
    totalByStatus,
    topCustomers: sortedTopCustomers,
    totalRevenue: quotes
      .filter(q => q.status === 'approved' || q.status === 'converted')
      .reduce((sum, q) => sum + (q.total || 0), 0),
  };
}

// ============ REPORTE FINANCIERO ============

export async function getFinancialReport(startDate?: string, endDate?: string) {
  let query = supabase
    .from('financial_transactions')
    .select('*')
    .order('transaction_date', { ascending: true });

  if (startDate && endDate) {
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  }

  const { data: transactions, error } = await query;
  if (error) throw error;

  const txs = transactions || [];
  
  const byDate = txs.reduce((acc: any, t: any) => {
    const date = t.transaction_date;
    if (!acc[date]) acc[date] = { date, income: 0, expense: 0 };
    if (t.transaction_type === 'income' || t.transaction_type === 'payment') {
      acc[date].income += t.amount || 0;
    } else {
      acc[date].expense += t.amount || 0;
    }
    return acc;
  }, {});

  const cashFlowData = Object.values(byDate).map((d: any) => ({
    ...d,
    balance: d.income - d.expense,
  }));

  const byType = txs.reduce((acc: any, t: any) => {
    acc[t.transaction_type] = (acc[t.transaction_type] || 0) + (t.amount || 0);
    return acc;
  }, {});

  const totalIncome = txs
    .filter(t => t.transaction_type === 'income' || t.transaction_type === 'payment')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalExpense = txs
    .filter(t => t.transaction_type === 'expense' || t.transaction_type === 'refund')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return {
    transactions: txs,
    cashFlowData,
    byType,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
  };
}

// ============ REPORTE DE INVENTARIO ============

export async function getInventoryReport() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('stock_quantity', { ascending: true });
  
  if (error) throw error;

  const prods = products || [];
  
  const byCategory = prods.reduce((acc: any, p: any) => {
    const cat = p.category || 'Sin categoría';
    if (!acc[cat]) acc[cat] = { category: cat, count: 0, value: 0 };
    acc[cat].count += 1;
    acc[cat].value += (p.stock_quantity || 0) * (p.cost || 0);
    return acc;
  }, {});

  const categoryData = Object.values(byCategory);
  
  const totalValue = prods.reduce((sum, p) => sum + (p.stock_quantity * p.cost), 0);
  const totalUnits = prods.reduce((sum, p) => sum + p.stock_quantity, 0);
  const lowStock = prods.filter(p => p.stock_quantity <= p.min_stock);
  const outOfStock = prods.filter(p => p.stock_quantity === 0);

  const topProducts = [...prods]
    .sort((a, b) => (b.stock_quantity * b.cost) - (a.stock_quantity * a.cost))
    .slice(0, 5)
    .map(p => ({ name: p.name, value: p.stock_quantity * p.cost }));

  return {
    products: prods,
    categoryData,
    totalValue,
    totalUnits,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    topProducts,
    lowStockProducts: lowStock,
  };
}

// ============ REPORTE DE OPERACIONES ============

export async function getOperationsReport() {
  const { data: workOrders, error } = await supabase
    .from('work_orders')
    .select('*, customers(full_name)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;

  const orders = workOrders || [];
  
  const byStatus = orders.reduce((acc: any, o: any) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const byServiceType = orders.reduce((acc: any, o: any) => {
    const type = o.service_type || 'Otro';
    if (!acc[type]) acc[type] = { name: type, value: 0 };
    acc[type].value += 1;
    return acc;
  }, {});

  const serviceTypeData = Object.values(byServiceType);
  
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
  const completed = orders.filter(o => o.status === 'completed');
  const avgCompletionTime = completed.length > 0 
    ? completed.reduce((sum, o) => {
        if (o.created_at && o.completed_at) {
          const diff = new Date(o.completed_at).getTime() - new Date(o.created_at).getTime();
          return sum + diff;
        }
        return sum;
      }, 0) / completed.length / (1000 * 60 * 60 * 24)
    : 0;

  return {
    workOrders: orders,
    byStatus,
    serviceTypeData,
    totalRevenue,
    completedCount: completed.length,
    pendingCount: orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
    avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
  };
}
