const defaultSettings = {
  tallyPort: 9000,
  companyName: "",
  backupInterval: 60,
  gdriveFolderId: "",
  autoSync: true,
  notifications: true
};

function createProfileId() {
  return `profile_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function normalizeProfile(profile = {}) {
  return {
    id: profile.id || createProfileId(),
    name: profile.name || "Untitled Profile",
    tallyCompany: profile.tallyCompany || "",
    backupType: profile.backupType || "full",
    schedule: profile.schedule || "daily",
    is_active: profile.is_active !== undefined ? Boolean(profile.is_active) : true,
    localPath: profile.localPath || "",
    compression: profile.compression !== undefined ? Boolean(profile.compression) : true
  };
}

export function createAppSlices(set) {
  return {
    backupProfiles: [],
    backupHistory: [],
    currentBackup: {
      running: false,
      progress: 0,
      currentType: ""
    },
    gdriveStatus: {
      connected: false,
      email: "",
      quota: {
        used: 0,
        total: 0
      }
    },
    settings: { ...defaultSettings },

    addBackupProfile: (profileData) =>
      set((state) => ({
        backupProfiles: [...state.backupProfiles, normalizeProfile(profileData)]
      })),

    updateBackupProfile: (id, updates) =>
      set((state) => ({
        backupProfiles: state.backupProfiles.map((profile) =>
          String(profile.id) === String(id)
            ? { ...profile, ...normalizeProfile({ ...profile, ...updates, id: profile.id }) }
            : profile
        )
      })),

    deleteBackupProfile: (id) =>
      set((state) => ({
        backupProfiles: state.backupProfiles.filter(
          (profile) => String(profile.id) !== String(id)
        )
      })),

    setBackupProfiles: (profiles = []) =>
      set(() => ({
        backupProfiles: profiles.map((profile) => normalizeProfile(profile))
      })),

    addBackupHistory: (historyRow) =>
      set((state) => ({
        backupHistory: [historyRow, ...state.backupHistory]
      })),

    clearBackupHistory: () =>
      set(() => ({
        backupHistory: []
      })),

    setCurrentBackup: (patch = {}) =>
      set((state) => ({
        currentBackup: {
          ...state.currentBackup,
          ...patch
        }
      })),

    resetCurrentBackup: () =>
      set(() => ({
        currentBackup: {
          running: false,
          progress: 0,
          currentType: ""
        }
      })),

    setGdriveStatus: (statusPatch = {}) =>
      set((state) => ({
        gdriveStatus: {
          ...state.gdriveStatus,
          ...statusPatch,
          quota: {
            ...state.gdriveStatus.quota,
            ...(statusPatch.quota || {})
          }
        }
      })),

    updateSettings: (settingsPatch = {}) =>
      set((state) => ({
        settings: {
          ...state.settings,
          ...settingsPatch
        }
      })),

    resetSettings: () =>
      set(() => ({
        settings: { ...defaultSettings }
      }))
  };
}
