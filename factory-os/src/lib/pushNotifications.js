import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = 'BPwh61SXS0GpOPRhLbYVEBjaOs9DHrZVg6h1cncw7zXCQv2r7dOrqQ1pQwzm482K907-apYk4y01pnkexqg_1ZU'; 

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported on this browser.');
  }

  const registration = await navigator.serviceWorker.ready;
  
  // Check if we already have a subscription
  let subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  // Save to Supabase
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not logged in');

  const subJson = subscription.toJSON();
  
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth
    }, { onConflict: 'user_id, endpoint' });

  if (error) throw error;
  
  return true;
}

export async function checkPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}
