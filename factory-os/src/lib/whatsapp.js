import { supabase } from './supabase';

/**
 * Send a WhatsApp template message via the whatsapp-proxy Edge Function.
 * Never calls graph.facebook.com directly — the Meta token lives in Supabase secrets.
 */
export async function sendWhatsApp({ to, templateName, parameters = [], lang = 'ar' }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ to, templateName, parameters, lang }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp proxy error: ${res.status} — ${err}`);
  }

  return res.json();
}
