import { useState, useEffect, useCallback } from 'react';
import { useIPC } from './useElectron';

export function useTallyStatus(port = 9000) {
  const { invoke } = useIPC();
  const [status, setStatus] = useState({ connected: false, companies: [] });
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke('pingTally', port);
      setStatus(result);
    } catch (error) {
      setStatus({ connected: false, error: error.message });
    } finally {
      setLoading(false);
    }
  }, [invoke, port]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkStatus]);

  return { status, loading, refresh: checkStatus };
}
