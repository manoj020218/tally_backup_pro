import { useCallback } from 'react';

export function useElectron() {
  const api = window.electronAPI;

  if (!api) {
    console.warn('Electron API not available');
    return {
      invoke: () => Promise.reject(new Error('Electron not available')),
      on: () => () => {}
    };
  }

  return api;
}

export function useIPC() {
  const api = useElectron();

  const invoke = useCallback((channel, ...args) => {
    if (typeof api.invoke === 'function') {
      return api.invoke(channel, ...args);
    }
    if (typeof api[channel] === 'function') {
      return api[channel](...args);
    }
    return Promise.reject(new Error(`Channel ${channel} not found`));
  }, [api]);

  return { invoke, on: api.on || (() => () => {}) };
}
