const defaultSettings = {
  tallyPort: 9000,
  tallyDataPath: "",
  companyName: "",
  backupInterval: 60,
  gdriveFolderId: "",
  autoSync: true,
  notifications: true,
  fallback900Enabled: true,
  startOnBoot: true,
  updateChannel: "stable",
  appVersion: "1.0.0",
  isPackaged: false
};

function createProfileId() {
  return `profile_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

const SCHEDULE_TO_CRON = {
  manual: "",
  hourly: "0 * * * *",
  daily: "0 2 * * *",
  weekly: "0 2 * * 0"
};

function cronToSchedule(cronValue) {
  const normalized = String(cronValue || "").trim();
  if (!normalized) return "manual";
  const match = Object.entries(SCHEDULE_TO_CRON).find(([, cron]) => cron === normalized);
  return match ? match[0] : "manual";
}

function parseDataTypes(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch (_error) {
      // Keep fallback if invalid JSON.
    }
  }
  return ["Sales"];
}

function normalizeProfile(profile = {}) {
  const schedule =
    profile.schedule ||
    cronToSchedule(profile.schedule_cron || profile.scheduleCron);
  const rawDateRangeMode =
    profile.dateRangeMode ||
    profile.date_range_mode ||
    profile.backupType ||
    "incremental";
  const normalizedDateRangeMode = String(rawDateRangeMode || "").trim().toLowerCase();
  const allowedModes = new Set([
    "full",
    "incremental",
    "thisfinancialyear",
    "lastfinancialyear",
    "custom"
  ]);
  const dateRangeMode = allowedModes.has(normalizedDateRangeMode)
    ? normalizedDateRangeMode
    : "incremental";
  const retentionDaysParsed = Number.parseInt(
    profile.retentionDays ?? profile.retention_days ?? "30",
    10
  );

  return {
    id: profile.id || createProfileId(),
    name: profile.name || "Untitled Profile",
    companyId: profile.companyId || profile.company_id || "",
    tallyCompany: profile.tallyCompany || profile.company_name || profile.tally_company || "",
    backupType: dateRangeMode,
    dateRangeMode,
    customFrom: profile.customFrom || profile.custom_from || "",
    customTo: profile.customTo || profile.custom_to || "",
    schedule,
    scheduleCron:
      profile.scheduleCron ||
      profile.schedule_cron ||
      SCHEDULE_TO_CRON[schedule] ||
      "",
    dataTypes: parseDataTypes(profile.dataTypes ?? profile.data_types),
    is_active: profile.is_active !== undefined ? Boolean(profile.is_active) : true,
    localPath: profile.localPath || profile.local_path || "",
    retentionDays: Number.isFinite(retentionDaysParsed) ? Math.max(1, retentionDaysParsed) : 30,
    gdriveEnabled:
      profile.gdriveEnabled !== undefined
        ? Boolean(profile.gdriveEnabled)
        : Boolean(profile.gdrive_enabled),
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
