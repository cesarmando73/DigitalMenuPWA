// src/lib/push-notifications.ts

/**
 * Convierte una clave VAPID base64 a un Uint8Array requerido por el navegador
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Suscribe al usuario actual a las notificaciones push
 */
export async function subscribeToPush(supabase: any) {
  try {
    // 1. Verificar si el SW está listo
    const registration = await navigator.serviceWorker.ready;

    // 2. Obtener la clave pública VAPID desde variables de entorno
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('No se encontró la clave VAPID pública.');
    }

    // 3. Suscribir al navegador al servicio de Push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    console.log('Suscripción generada:', subscription);

    // 4. Guardar en Supabase
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        subscription_json: subscription,
      }, { onConflict: 'endpoint' });

    if (error) throw error;

    return { success: true, subscription };
  } catch (error) {
    console.error('Error al suscribirse:', error);
    return { success: false, error };
  }
}

/**
 * Verifica el estado actual de la suscripción
 */
export async function getSubscriptionStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) return 'subscribed';
  
  if (Notification.permission === 'denied') return 'denied';
  
  return 'prompt';
}
