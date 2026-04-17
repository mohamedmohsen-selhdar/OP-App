import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { flushQueue, getQueue } from '../lib/offlineQueue';

export function useOffline(onFlush) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(getQueue().length);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setQueueLength(getQueue().length);
      flushQueue(onFlush).then(() => setQueueLength(getQueue().length));
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onFlush]);

  return { isOnline, queueLength };
}
