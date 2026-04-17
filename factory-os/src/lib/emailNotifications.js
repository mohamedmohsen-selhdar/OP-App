import { supabase } from './supabase';

/**
 * Send a bilingual email via the resend-proxy Edge Function.
 * Never calls Resend directly from the browser.
 */
export async function sendEmail({ to, subject_ar, subject_en, body_ar, body_en, lang = 'ar' }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const subject = lang === 'ar' ? subject_ar : subject_en;
  const html = buildEmailTemplate({ body_ar, body_en, lang });

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        from: 'FLAPP <noreply@factoryos.app>',
        to,
        subject,
        html,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email proxy error: ${res.status} — ${err}`);
  }

  return res.json();
}

function buildEmailTemplate({ body_ar, body_en, lang }) {
  return `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: ${lang === 'ar' ? '"Cairo"' : '"Inter"'}, sans-serif; background: #f1f5f9; margin: 0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
    .header  { background: #f59e0b; padding: 24px; text-align: center; }
    .header h1 { color: #1c1917; font-size: 22px; margin: 0; }
    .body   { padding: 28px; }
    .ar-block { text-align: right; color: #0f172a; font-family: "Cairo", sans-serif; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
    .en-block { text-align: left;  color: #475569; font-family: "Inter", sans-serif; font-size: 0.9em; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1 style="font-family: 'Outfit', sans-serif; font-weight: 900; letter-spacing: -1px; margin:0;"><span style="color: #ffffff;">FL</span><span style="color: #b91c1c;">APP</span></h1></div>
    <div class="body">
      <div class="ar-block">${body_ar}</div>
      <div class="en-block">${body_en}</div>
    </div>
    <div class="footer">FLAPP — Manufacturing ERP</div>
  </div>
</body>
</html>`;
}
