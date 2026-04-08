import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, primary_color, email, password, phone } = body;

    if (!name || !slug || !email || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Crear el restaurante en la base de datos con valores por defecto de suscripción
    const { data: restaurant, error: resError } = await supabaseAdmin
      .from('restaurants')
      .insert({ 
        name, 
        slug, 
        primary_color,
        status: 'active',
        subscription_plan: 'monthly',
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días de prueba
      })
      .select()
      .single();

    if (resError) throw resError;

    // 2. Crear el usuario en Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      await supabaseAdmin.from('restaurants').delete().eq('id', restaurant.id);
      throw authError;
    }

    // 3. Crear el registro en profiles con el teléfono
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        restaurant_id: restaurant.id,
        phone: phone // Nuevo campo
      });

    if (profileError) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      await supabaseAdmin.from('restaurants').delete().eq('id', restaurant.id);
      throw profileError;
    }

    return NextResponse.json({ 
      success: true, 
      restaurant, 
      userId: authUser.user.id 
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
