import { supabase } from '../supabase/client';

export interface Product {
  id?: number;
  sku: string;
  name: string;
  category?: string;
  brand?: string;
  description?: string;
  cost: number;
  price: number;
  stock_quantity: number;
  min_stock: number;
  location?: string;
  supplier_id?: number;
  warranty_months?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Movement {
  id?: number;
  product_id: number;
  movement_type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface Supplier {
  id?: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  tax_id?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
}

// ============ PRODUCTOS ============

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, suppliers(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function getProductById(id: number) {
  const { data, error } = await supabase
    .from('products')
    .select('*, suppliers(name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as any;
}

export async function createProduct(product: any) {
  const productData = {
    sku: product.sku,
    name: product.name,
    category: product.category || null,
    brand: product.brand || null,
    description: product.description || null,
    cost: product.cost || 0,
    price: product.price || 0,
    stock_quantity: product.stock_quantity || 0,
    min_stock: product.min_stock || 0,
    location: product.location || null,
    supplier_id: product.supplier_id || null,
    warranty_months: product.warranty_months || null,
    is_active: product.is_active !== false
  };

  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProduct(id: number, product: any) {
  const productData: any = {
    sku: product.sku,
    name: product.name,
    category: product.category || null,
    brand: product.brand || null,
    description: product.description || null,
    cost: product.cost || 0,
    price: product.price || 0,
    stock_quantity: product.stock_quantity || 0,
    min_stock: product.min_stock || 0,
    location: product.location || null,
    supplier_id: product.supplier_id || null,
    warranty_months: product.warranty_months || null,
    is_active: product.is_active !== false
  };

  const { data, error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: number) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============ MOVIMIENTOS ============

export async function getMovements() {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as any[];
}

export async function createMovement(movement: any) {
  const movementData = {
    product_id: movement.product_id,
    movement_type: movement.movement_type,
    quantity: movement.quantity,
    unit_cost: movement.unit_cost || null,
    reference_type: movement.reference_type || null,
    reference_id: movement.reference_id || null,
    notes: movement.notes || null,
    created_by: movement.created_by || null
  };

  // Insertar movimiento
  const { data: movData, error: movError } = await supabase
    .from('inventory_movements')
    .insert(movementData)
    .select()
    .single();
  
  if (movError) throw movError;

  // Actualizar stock del producto
  const product = await getProductById(movement.product_id);
  let newStock = product.stock_quantity;
  
  if (movement.movement_type === 'entry') {
    newStock += movement.quantity;
  } else if (movement.movement_type === 'exit') {
    newStock -= movement.quantity;
  } else if (movement.movement_type === 'adjustment') {
    newStock = movement.quantity;
  }

  await updateProduct(movement.product_id, { ...product, stock_quantity: newStock });

  return movData;
}

export async function deleteMovement(id: number) {
  const { error } = await supabase.from('inventory_movements').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============ PROVEEDORES ============

export async function getSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Supplier[];
}

export async function createSupplier(supplier: any) {
  const supplierData = {
    name: supplier.name,
    contact_person: supplier.contact_person || null,
    email: supplier.email || null,
    phone: supplier.phone || null,
    address: supplier.address || null,
    city: supplier.city || null,
    tax_id: supplier.tax_id || null,
    payment_terms: supplier.payment_terms || null,
    notes: supplier.notes || null,
    is_active: supplier.is_active !== false
  };

  const { data, error } = await supabase
    .from('suppliers')
    .insert(supplierData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateSupplier(id: number, supplier: any) {
  const supplierData: any = {
    name: supplier.name,
    contact_person: supplier.contact_person || null,
    email: supplier.email || null,
    phone: supplier.phone || null,
    address: supplier.address || null,
    city: supplier.city || null,
    tax_id: supplier.tax_id || null,
    payment_terms: supplier.payment_terms || null,
    notes: supplier.notes || null,
    is_active: supplier.is_active !== false
  };

  const { data, error } = await supabase
    .from('suppliers')
    .update(supplierData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: number) {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
  return true;
}
