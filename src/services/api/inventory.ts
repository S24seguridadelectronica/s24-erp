import { supabase } from '../supabase/client';
import { audit } from './audit';

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
  image_url?: string;
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

export async function getProducts() {
  const { data, error } = await (supabase.from('products') as any).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as any[];
}

export async function getProductById(id: number) {
  const { data, error } = await (supabase.from('products') as any).select('*').eq('id', id).single();
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
    is_active: product.is_active !== false,
    image_url: product.image_url || null
  };

  const { data, error } = await (supabase.from('products') as any).insert([productData]).select().single();
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear el producto');

  await audit.log('create', 'products', String(data.id), `Producto creado: ${data.name}`);

  return data;
}

export async function updateProduct(id: number, product: any) {
  const { data: oldData } = await (supabase.from('products') as any).select('*').eq('id', id).single();

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
    is_active: product.is_active !== false,
    image_url: product.image_url || null
  };

  const { data, error } = await (supabase.from('products') as any).update(productData).eq('id', id).select().single();
  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar el producto');

  await audit.log('update', 'products', String(id), `Producto actualizado: ${data.name}`);

  return data;
}

export async function deleteProduct(id: number) {
  const { data: oldData } = await (supabase.from('products') as any).select('*').eq('id', id).single();

  const { error } = await (supabase.from('products') as any).delete().eq('id', id);
  if (error) throw error;

  await audit.log('delete', 'products', String(id), `Producto eliminado: ${oldData?.name || 'Desconocido'}`);

  return true;
}

export async function getMovements() {
  const { data, error } = await (supabase.from('inventory_movements') as any)
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as any[];
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

  const { data: movData, error: movError } = await (supabase.from('inventory_movements') as any)
    .insert([movementData])
    .select()
    .single();

  if (movError) throw movError;
  if (!movData) throw new Error('No se pudo crear el movimiento');

  const product = await getProductById(movement.product_id);
  let newStock = product.stock_quantity;

  if (movement.movement_type === 'entry') newStock += movement.quantity;
  else if (movement.movement_type === 'exit') newStock -= movement.quantity;
  else if (movement.movement_type === 'adjustment') newStock = movement.quantity;

  await updateProduct(movement.product_id, { ...product, stock_quantity: newStock });

  await audit.log(
    'create',
    'inventory_movements',
    String(movData.id),
    `Movimiento de inventario: ${movement.movement_type} - ${product.name} x${movement.quantity}`
  );

  return movData;
}

export async function deleteMovement(id: number) {
  const { error } = await (supabase.from('inventory_movements') as any).delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function getSuppliers() {
  const { data, error } = await (supabase.from('suppliers') as any).select('*').order('name');
  if (error) throw error;
  return (data || []) as Supplier[];
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

  const { data, error } = await (supabase.from('suppliers') as any).insert([supplierData]).select().single();
  if (error) throw error;
  if (!data) throw new Error('No se pudo crear el proveedor');

  await audit.log('create', 'suppliers', String(data.id), `Proveedor creado: ${data.name}`);

  return data;
}

export async function updateSupplier(id: number, supplier: any) {
  const { data: oldData } = await (supabase.from('suppliers') as any).select('*').eq('id', id).single();

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

  const { data, error } = await (supabase.from('suppliers') as any).update(supplierData).eq('id', id).select().single();
  if (error) throw error;
  if (!data) throw new Error('No se pudo actualizar el proveedor');

  await audit.log('update', 'suppliers', String(id), `Proveedor actualizado: ${data.name}`);

  return data;
}

export async function deleteSupplier(id: number) {
  const { data: oldData } = await (supabase.from('suppliers') as any).select('*').eq('id', id).single();

  const { error } = await (supabase.from('suppliers') as any).delete().eq('id', id);
  if (error) throw error;

  await audit.log('delete', 'suppliers', String(id), `Proveedor eliminado: ${oldData?.name || 'Desconocido'}`);

  return true;
}
// ============ UPLOAD DE IMÁGENES ============
export async function uploadProductImage(productId: number, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `product-${productId}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function deleteProductImage(imageUrl: string): Promise<void> {
  const fileName = imageUrl.split('/').pop();
  if (!fileName) return;

  const { error } = await supabase.storage
    .from('product-images')
    .remove([fileName]);

  if (error) throw error;
}