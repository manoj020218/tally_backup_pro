const { contextBridge, ipcRenderer } = require('electron');

const invokeChannelMap = {
  // Tally
  pingTally: 'tally:ping',
  getCompanies: 'tally:getCompanies',

  // Backup
  startBackup: 'backup:start',
  manualBackup: 'backup:manual',

  // Profiles
  getProfiles: 'profiles:getAll',
  createProfile: 'profiles:create',
  updateProfile: 'profiles:update',
  deleteProfile: 'profiles:delete',

  // Settings
  getSettings: 'settings:get',
  updateSettings: 'settings:update',

  // License
  validateLicense: 'license:validate',
  revalidateLicense: 'license:revalidate',
  validateLicenseOnStartup: 'license:validateOnStartup',
  getLicenseStatus: 'license:status'
};

const directAllowedInvokeChannels = new Set([
  'tally:ping',
  'tally:getCompanies',
  'backup:start',
  'backup:manual',
  'profiles:getAll',
  'profiles:create',
  'profiles:update',
  'profiles:delete',
  'settings:get',
  'settings:update',
  'license:validate',
  'license:revalidate',
  'license:validateOnStartup',
  'license:status'
]);

const allowedEventChannels = new Set([
  'backup:complete',
  'backup:error',
  'backup:scheduled-complete',
  'backup:scheduled-error',
  'menu:backup-now',
  'menu:open-settings'
]);

function resolveInvokeChannel(channelOrAlias) {
  if (invokeChannelMap[channelOrAlias]) {
    return invokeChannelMap[channelOrAlias];
  }
  if (typeof channelOrAlias === 'string' && directAllowedInvokeChannels.has(channelOrAlias)) {
    return channelOrAlias;
  }
  return null;
}

function invoke(channelOrAlias, ...args) {
  const resolvedChannel = resolveInvokeChannel(channelOrAlias);
  if (!resolvedChannel) {
    return Promise.reject(new Error(`IPC channel not allowed: ${channelOrAlias}`));
  }
  return ipcRenderer.invoke(resolvedChannel, ...args);
}

function on(channel, listener) {
  if (!allowedEventChannels.has(channel)) {
    throw new Error(`IPC event channel not allowed: ${channel}`);
  }
  if (typeof listener !== 'function') {
    throw new Error('Listener must be a function.');
  }

  const wrapped = (_event, ...args) => listener(...args);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

function once(channel, listener) {
  if (!allowedEventChannels.has(channel)) {
    throw new Error(`IPC event channel not allowed: ${channel}`);
  }
  if (typeof listener !== 'function') {
    throw new Error('Listener must be a function.');
  }

  const wrapped = (_event, ...args) => listener(...args);
  ipcRenderer.once(channel, wrapped);
}

function off(channel, listener) {
  if (!allowedEventChannels.has(channel)) {
    throw new Error(`IPC event channel not allowed: ${channel}`);
  }
  ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke,
  on,
  once,
  off,
  pingTally: (port) => invoke('pingTally', port),
  getCompanies: (port) => invoke('getCompanies', port),
  startBackup: (profileId) => invoke('startBackup', profileId),
  manualBackup: (options) => invoke('manualBackup', options),
  getProfiles: () => invoke('getProfiles'),
  createProfile: (profile) => invoke('createProfile', profile),
  updateProfile: (id, updates) => invoke('updateProfile', id, updates),
  deleteProfile: (id) => invoke('deleteProfile', id),
  getSettings: () => invoke('getSettings'),
  updateSettings: (settings) => invoke('updateSettings', settings),
  validateLicense: (licenseKey) => invoke('validateLicense', licenseKey),
  revalidateLicense: () => invoke('revalidateLicense'),
  validateLicenseOnStartup: () => invoke('validateLicenseOnStartup'),
  getLicenseStatus: () => invoke('getLicenseStatus')
});
