import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as webpush from "https://esm.sh/web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!; // This is usually provided by default
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(
  "mailto:admin@factoryos.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body, userId } = await req.json();

    // 1. Send Email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "FLAPP <noreply@factoryos.app>",
        to,
        subject,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h1 style="color: #000; font-weight: 900; letter-spacing: -2px;">FL<span style="color: #b91c1c;">APP</span></h1>
                <h2 style="font-size: 1.25rem;">${subject}</h2>
                <p style="color: #444; line-height: 1.6;">${body}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8rem; color: #888;">© 2026 FLAPP Systems. All rights reserved.</p>
              </div>`,
      }),
    });

    const emailStatus = emailRes.ok;

    // 2. Fetch Push Subscriptions & Send Push
    let pushCount = 0;
    if (userId) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (subs && subs.length > 0) {
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              sub.subscription,
              JSON.stringify({
                title: subject,
                body: body,
                icon: 'https://factoryos.app/icon-192.png',
                data: { url: '/' }
              })
            );
            pushCount++;
          } catch (err) {
            console.error("Push Error for Sub:", sub.id, err);
            // If subscription is expired, delete it
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email: emailStatus, 
        pushed: pushCount 
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
