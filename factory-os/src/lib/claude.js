import { supabase } from './supabase';

/**
 * Call the ai-proxy Edge Function (server-side Claude API).
 * Never calls Anthropic directly — the API key lives in Supabase secrets.
 */
export async function askClaude({ system, messages, model }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        system,
        messages,
        model: model ?? 'claude-sonnet-4-5', // verify latest at docs.anthropic.com
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI proxy error: ${res.status} — ${err}`);
  }

  const data = await res.json();
  // Extract the text content from Claude's response
  const raw = data?.content?.[0]?.text ?? '';
  return raw;
}

/**
 * Parse Claude's JSON response safely.
 * Claude may wrap it in markdown fences — strips them before parsing.
 */
export function parseClaudeJSON(raw) {
  const clean = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('Claude returned invalid JSON. Raw: ' + raw.slice(0, 200));
  }
}
