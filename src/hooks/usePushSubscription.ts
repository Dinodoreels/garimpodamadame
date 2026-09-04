import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const VAPID_PUBLIC_KEY_SETTING = 'vapid_public_key';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const subscribe = async () => {
      try {
        // Get VAPID public key from site_settings
        const { data: setting } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', VAPID_PUBLIC_KEY_SETTING)
          .maybeSingle();

        if (!setting?.value) return;

        const vapidKey = typeof setting.value === 'string' ? setting.value : (setting.value as any).key;
        if (!vapidKey) return;

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // Check if already subscribed
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          // Already subscribed, ensure it's saved
          const key = existingSub.getKey('p256dh');
          const auth = existingSub.getKey('auth');
          if (key && auth) {
            const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
            const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));
            
            // Check if this subscription exists in DB
            const { data: existing } = await supabase
              .from('push_subscriptions' as any)
              .select('id')
              .eq('user_id', user.id)
              .eq('endpoint', existingSub.endpoint)
              .maybeSingle();

            if (!existing) {
              await supabase.from('push_subscriptions' as any).insert({
                user_id: user.id,
                endpoint: existingSub.endpoint,
                p256dh: p256dh,
                auth: authKey,
              });
            }
          }
          return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const key = subscription.getKey('p256dh');
        const auth = subscription.getKey('auth');
        if (!key || !auth) return;

        const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
        const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

        await supabase.from('push_subscriptions' as any).insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth: authKey,
        });
      } catch (err) {
        console.log('Push subscription failed:', err);
      }
    };

    subscribe();
  }, [user]);
}
