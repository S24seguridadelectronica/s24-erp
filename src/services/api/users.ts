import { supabase } from '../supabase/client';

export interface User {
  id?: string;
  email: string;
  full_name: string;
  phone?: string;
  is_active?: boolean;
  role_id?: number;
  created_at?: string;
}

export async function getUsers() {
  const { data, error } = await (supabase.from('profiles') as any)
    .select(`
      id,
      email,
      full_name,
      phone,
      is_active,
      created_at,
      user_roles!inner(role_id)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const usersWithRoles = await Promise.all(
    (data || []).map(async (user: any) => {
      const roleId = user.user_roles?.[0]?.role_id;
      let roleName = 'Sin rol';
      if (roleId) {
        const { data: roleData } = await (supabase.from('roles') as any)
          .select('name, label')
          .eq('id', roleId)
          .maybeSingle();
        roleName = roleData?.label || roleData?.name || 'Sin rol';
      }
      return {
        ...user,
        role_id: roleId,
        roles: { name: roleName }
      };
    })
  );

  return usersWithRoles;
}

export async function getUserById(id: string) {
  const { data, error } = await (supabase.from('profiles') as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ✅ FUNCIÓN NUEVA: Crea automáticamente la config de distribución si es vendedor
async function ensureDistributionConfig(userId: string, roleId: number) {
  const { data: roleData } = await (supabase.from('roles') as any)
    .select('name')
    .eq('id', roleId)
    .maybeSingle();

  const roleName = roleData?.name?.toLowerCase() || '';
  
  if (roleName.includes('vend') || roleName.includes('sales') || roleName.includes('vendedor')) {
    const { data: maxOrder } = await (supabase.from('distribution_config') as any)
      .select('round_robin_order')
      .order('round_robin_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const nextOrder = maxOrder ? (maxOrder.round_robin_order || 0) + 1 : 1;

    await (supabase.from('distribution_config') as any).upsert({
      seller_id: userId,
      is_eligible: true,
      is_excluded: false,
      weight_percentage: 0,
      round_robin_order: nextOrder
    }, { onConflict: 'seller_id' });
  }
}

export async function createUser(userData: {
  email: string;
  full_name: string;
  phone?: string;
  role_id?: number;
  password?: string;
}) {
  const password = userData.password || 'S24Temp2024!';

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: password,
    options: { data: { full_name: userData.full_name } }
  });

  if (authError) throw authError;

  const userId = authData.user?.id;
  if (!userId) throw new Error('No se pudo crear el usuario');

  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: existingProfile } = await (supabase.from('profiles') as any)
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    const { error: profileError } = await (supabase.from('profiles') as any)
      .insert({
        id: userId,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    if (profileError) throw new Error('Error al crear perfil: ' + profileError.message);
  } else {
    const { error: profileError } = await (supabase.from('profiles') as any)
      .update({
        full_name: userData.full_name,
        phone: userData.phone || null,
        is_active: true
      })
      .eq('id', userId);
    if (profileError) throw new Error('Error al actualizar perfil: ' + profileError.message);
  }

  if (userData.role_id) {
    await (supabase.from('user_roles') as any).delete().eq('user_id', userId);

    const { error: roleError } = await (supabase.from('user_roles') as any)
      .insert({ user_id: userId, role_id: userData.role_id });

    if (roleError) throw new Error('Error al asignar rol: ' + roleError.message);

    // ✅ AQUÍ SE LLAMA A LA FUNCIÓN MÁGICA
    await ensureDistributionConfig(userId, userData.role_id);
  }

  return { id: userId, ...userData };
}

export async function updateUser(id: string, userData: Partial<User>) {
  const { error } = await (supabase.from('profiles') as any)
    .update({
      full_name: userData.full_name,
      phone: userData.phone || null,
      is_active: userData.is_active
    })
    .eq('id', id);

  if (error) throw error;

  if (userData.role_id) {
    await (supabase.from('user_roles') as any).delete().eq('user_id', id);

    const { error: roleError } = await (supabase.from('user_roles') as any)
      .insert({ user_id: id, role_id: userData.role_id });

    if (roleError) throw new Error('Error al asignar rol: ' + roleError.message);

    // ✅ AQUÍ TAMBIÉN, por si le cambias el rol a alguien existente
    await ensureDistributionConfig(id, userData.role_id);
  }

  return { id, ...userData };
}

export async function deleteUser(id: string) {
  const { error: roleError } = await (supabase.from('user_roles') as any)
    .delete()
    .eq('user_id', id);
  if (roleError) throw roleError;

  const { error: distError } = await (supabase.from('distribution_config') as any)
    .delete()
    .eq('seller_id', id);
  // Ignoramos el error si no existe config de distribución

  const { error: profileError } = await (supabase.from('profiles') as any)
    .delete()
    .eq('id', id);
  if (profileError) throw profileError;

  return true;
}

export async function getRoles() {
  const { data, error } = await (supabase.from('roles') as any)
    .select('*')
    .order('label');
  if (error) throw error;
  return data || [];
}

export async function updateUserRole(userId: string, roleId: number) {
  await (supabase.from('user_roles') as any).delete().eq('user_id', userId);

  const { error } = await (supabase.from('user_roles') as any)
    .insert({ user_id: userId, role_id: roleId });

  if (error) throw error;
  
  await ensureDistributionConfig(userId, roleId);
  return true;
}
