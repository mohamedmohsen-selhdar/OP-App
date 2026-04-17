import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

webpush.setVapidDetails(
  "mailto:admin@factoryos.app",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  const { to, subject, html, userId } = await req.json();

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
      html,
    }),
  });

  // 2. Fetch Push Subscriptions from DB (if userId provided)
  let pushResults = [];
  if (userId) {
    // This part requires access to the DB. 
    // In Edge Functions, you use the Service Role key or the user's token.
    // We'll skip the DB query here and assume the caller provides subscriptions 
    // OR we use the supabase-js client if available.
  }

  return new Response(JSON.stringify({ email: emailRes.ok }), {
    headers: { "Content-Type": "application/json" },
  });
});
