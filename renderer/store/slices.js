const defaultSettings = {
  tallyPort: 9000,
  tallyDataPath: "",
  companyName: "",
  backupInterval: 60,
  gdriveFolderId: "",
  gdriveClientId: "000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
  gdriveClientSecret: "dummy-client-secret",
  gdriveRedirectUri: "http://127.0.0.1:3478/oauth2callback",
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

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  return defaultValue;
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
        ? parseBoolean(profile.gdriveEnabled, false)
        : parseBoolean(profile.gdrive_enabled, false),
    compression: profile.compression !== undefined ? parseBoolean(profile.compression, true) : true
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
    emailSettings: {
      enabled: false,
      provider: "smtp",
      recipientEmails: [],
      notifyOnSuccess: true,
      notifyOnFailure: true,
      fromEmail: "",
      smtpHost: "",
      smtpPort: 587,
      smtpUser: ""
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

    updateEmailSettings: (emailSettingsPatch = {}) =>
      set((state) => ({
        emailSettings: {
          ...state.emailSettings,
          ...emailSettingsPatch
        }
      })),

    resetSettings: () =>
      set(() => ({
        settings: { ...defaultSettings }
      }))
  };
}
