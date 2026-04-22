import { useCallback } from 'react';

export function useElectron() {
  const api = window.electronAPI;

  if (!api) {
    console.warn('Electron API not available');
    return {
      invoke: () => Promise.reject('Electron not available'),
      on: () => () => {}
    };
  }

  return api;
}

export function useIPC() {
  const api = useElectron();

  const invoke = useCallback((channel, ...args) => {
    return api[channel]?.(...args) || Promise.reject(\`Channel \${channel} not found\`);
  }, [api]);

  return { invoke, on: api.on };
}
