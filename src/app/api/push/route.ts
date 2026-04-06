// src/app/api/push/route.ts
import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error('VAPID keys are not configured in environment variables');
    }

    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'info@caspadri.com'}`,
      publicKey,
      privateKey
    );

    const { title, body, url } = await request.json();

    // 1. Inicializar Supabase con Service Role para leer todas las suscripciones
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Obtener todas las suscripciones
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*');

    if (error) throw error;

    console.log(`Enviando notificación a ${subscriptions.length} suscriptores...`);

    // 3. Enviar a cada uno
    const notifications = subscriptions.map((sub: any) => {
      const payload = JSON.stringify({
        title,
        body,
        url: url || '/',
      });

      return webpush.sendNotification(sub.subscription_json, payload)
        .catch(async (err: any) => {
          console.error('Error enviando a un endpoint:', sub.endpoint, err.statusCode);
          // Si el endpoint ya no es válido (404 o 410), lo eliminamos
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .match({ id: sub.id });
          }
        });
    });

    await Promise.all(notifications);

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (error: any) {
    console.error('Error in Push API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
