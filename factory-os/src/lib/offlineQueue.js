import { supabase } from '../lib/supabase';

const QUEUE_KEY = 'factoryos_offline_queue';

/** Queue an operation when offline */
export function enqueue(operation) {
  const queue = getQueue();
  queue.push({ ...operation, queuedAt: new Date().toISOString(), id: crypto.randomUUID() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Get the current queue */
export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Flush queued operations when back online */
export async function flushQueue(onItemProcessed) {
  const queue = getQueue();
  if (!queue.length) return;

  const remaining = [];
  for (const op of queue) {
    try {
      const { error } = await supabase.from(op.table)[op.method](op.data);
      if (error) throw error;
      onItemProcessed?.({ success: true, op });
    } catch (err) {
      console.error('[OfflineQueue] Failed to flush:', op, err);
      remaining.push(op);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
