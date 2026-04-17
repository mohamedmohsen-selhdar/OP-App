import { supabase } from './supabase';

/**
 * Export data to a new Google Sheet via the google-sheets-proxy Edge Function.
 * Opens the created sheet URL in a new tab.
 */
export async function exportToGoogleSheets({ rows, headers_ar, headers_en, sheetTitle }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ rows, headers_ar, headers_en, sheetTitle }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheets proxy error: ${res.status} — ${err}`);
  }

  const { url } = await res.json();
  window.open(url, '_blank');
  return url;
}
