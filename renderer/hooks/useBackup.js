import { useState, useCallback } from 'react';
import { useIPC } from './useElectron';

export function useBackup() {
  const { invoke } = useIPC();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startBackup = useCallback(async (profileId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('startBackup', profileId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  const manualBackup = useCallback(async (options) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke('manualBackup', options);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  return { startBackup, manualBackup, loading, error };
}
