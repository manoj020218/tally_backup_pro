import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store";
import { useIPC } from "../hooks/useElectron";
import { useBackup } from "../hooks/useBackup";
import StatusBadge from "../components/StatusBadge";
import SizeEstimator from "../components/SizeEstimator";

const SCHEDULE_TO_CRON = {
  manual: "",
  hourly: "0 * * * *",
  daily: "0 2 * * *",
  weekly: "0 2 * * 0"
};

const DATE_RANGE_OPTIONS = [
  { value: "incremental", label: "Incremental (since last backup)" },
  { value: "full", label: "Full Backup" },
  { value: "thisfinancialyear", label: "This Financial Year" },
  { value: "lastfinancialyear", label: "Last Financial Year" },
  { value: "custom", label: "Custom Date Range" }
];

const DATA_TYPE_OPTIONS = [
  "Sales",
  "Purchase",
  "Receipt",
  "Payment",
  "Journal",
  "Credit Note",
  "Debit Note",
  "Stock Journal",
  "Delivery Note",
  "STOCKITEM",
  "LEDGER",
  "UNIT",
  "STOCKGROUP",
  "FULL_900_BACKUP"
];

const DATA_TYPE_LABELS = {
  FULL_900_BACKUP: ".900 File Backup"
};

const DEFAULT_FORM = {
  name: "",
  companyId: "",
  tallyCompany: "",
  dateRangeMode: "incremental",
  customFrom: "",
  customTo: "",
  schedule: "daily",
  dataTypes: ["Sales"],
  is_active: true,
  gdriveEnabled: false,
  localPath: "",
  retentionDays: 30
};

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  return defaultValue;
}

function toFormData(profile = {}) {
  return {
    ...DEFAULT_FORM,
    ...profile,
    dateRangeMode: String(
      profile.dateRangeMode ||
        profile.date_range_mode ||
        profile.backupType ||
        "incremental"
    ).toLowerCase(),
    customFrom: profile.customFrom || profile.custom_from || "",
    customTo: profile.customTo || profile.custom_to || "",
    is_active: profile.is_active !== undefined ? Boolean(profile.is_active) : true,
    gdriveEnabled:
      profile.gdriveEnabled !== undefined
        ? parseBoolean(profile.gdriveEnabled, false)
        : profile.gdrive_enabled !== undefined
        ? parseBoolean(profile.gdrive_enabled, false)
        : false,
    retentionDays: Number.parseInt(profile.retentionDays || profile.retention_days || "30", 10) || 30
  };
}

function toDbPayload(formData = {}) {
  const schedule = String(formData.schedule || "manual").toLowerCase();
  const dateRangeMode = String(formData.dateRangeMode || "incremental").toLowerCase();
  const retentionDays = Number.parseInt(String(formData.retentionDays || "30"), 10);

  return {
    company_id: String(formData.companyId || "").trim(),
    company_name: String(formData.tallyCompany || "").trim(),
    name: String(formData.name || "").trim(),
    data_types:
      Array.isArray(formData.dataTypes) && formData.dataTypes.length > 0
        ? formData.dataTypes
        : ["Sales"],
    schedule_cron: SCHEDULE_TO_CRON[schedule] || "",
    date_range_mode: dateRangeMode,
    custom_from: dateRangeMode === "custom" ? String(formData.customFrom || "").trim() : null,
    custom_to: dateRangeMode === "custom" ? String(formData.customTo || "").trim() : null,
    retention_days: Number.isFinite(retentionDays) ? Math.max(1, retentionDays) : 30,
    local_path: String(formData.localPath || "").trim(),
    gdrive_enabled: Boolean(formData.gdriveEnabled),
    is_active: formData.is_active !== false
  };
}

function normalizeCompanyList(payload) {
  if (!Array.isArray(payload)) return [];

  const items = payload
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { id: "", name } : null;
      }
      if (item && typeof item === "object") {
        const name = String(item.name || "").trim();
        if (!name) return null;
        return {
          id: String(item.id || "").trim(),
          name
        };
      }
      return null;
    })
    .filter(Boolean);

  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.id}|${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatModeLabel(mode) {
  const found = DATE_RANGE_OPTIONS.find((item) => item.value === String(mode || "").toLowerCase());
  return found ? found.label : String(mode || "incremental");
}

export default function BackupProfiles() {
  const { invoke } = useIPC();
  const { estimateBackup, loading: estimating } = useBackup();
  const backupProfiles = useAppStore((state) => state.backupProfiles);
  const setBackupProfiles = useAppStore((state) => state.setBackupProfiles);

  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [formError, setFormError] = useState("");

  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [sizeEstimate, setSizeEstimate] = useState({
    breakdown: [],
    totalBytes: 0,
    error: ""
  });

  const tallyPort = useAppStore((state) => Number.parseInt(state.settings?.tallyPort || "9000", 10));
  const hasCompanyDropdown = availableCompanies.length > 0;

  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const profiles = await invoke("getProfiles");
      if (Array.isArray(profiles)) {
        setBackupProfiles(profiles);
      } else {
        throw new Error("Unexpected profile response from backend.");
      }
    } catch (error) {
      setFormError(`Unable to load profiles: ${error.message}`);
    } finally {
      setLoadingProfiles(false);
    }
  }, [invoke, setBackupProfiles]);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    setCompanyError("");

    try {
      const result = await invoke("getCompanies", Number.isFinite(tallyPort) ? tallyPort : 9000);
      if (result && !Array.isArray(result) && result.error) {
        throw new Error(result.error);
      }

      const normalized = normalizeCompanyList(result);
      setAvailableCompanies(normalized);
      if (normalized.length === 0) {
        setCompanyError("No companies returned by Tally. Keep Tally open with company loaded.");
      }
    } catch (error) {
      setAvailableCompanies([]);
      setCompanyError(error.message);
    } finally {
      setLoadingCompanies(false);
    }
  }, [invoke, tallyPort]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (isEditing) {
      loadCompanies();
    }
  }, [isEditing, loadCompanies]);

  const sortedProfiles = useMemo(
    () => [...backupProfiles].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
    [backupProfiles]
  );

  const handleOpenCreate = () => {
    setFormError("");
    setEditingProfile(null);
    setFormData(DEFAULT_FORM);
    setSizeEstimate({ breakdown: [], totalBytes: 0, error: "" });
    setIsEditing(true);
  };

  const handleEdit = (profile) => {
    setFormError("");
    setEditingProfile(profile);
    setFormData(toFormData(profile));
    setSizeEstimate({ breakdown: [], totalBytes: 0, error: "" });
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setIsEditing(false);
    setEditingProfile(null);
    setFormError("");
    setSizeEstimate({ breakdown: [], totalBytes: 0, error: "" });
  };

  const toggleDataType = (dataType, checked) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.dataTypes) ? prev.dataTypes : [];
      if (checked) {
        if (current.includes(dataType)) return prev;
        return { ...prev, dataTypes: [...current, dataType] };
      }
      const next = current.filter((item) => item !== dataType);
      return { ...prev, dataTypes: next.length > 0 ? next : ["Sales"] };
    });
  };

  function validateCustomRange() {
    if (formData.dateRangeMode !== "custom") return "";
    if (!formData.customFrom || !formData.customTo) {
      return "Custom date range requires both From and To dates.";
    }
    if (new Date(formData.customFrom).getTime() > new Date(formData.customTo).getTime()) {
      return "Custom From date cannot be greater than To date.";
    }
    return "";
  }

  const handleEstimateSize = async () => {
    setSizeEstimate({ breakdown: [], totalBytes: 0, error: "" });

    const customRangeError = validateCustomRange();
    if (customRangeError) {
      setSizeEstimate({
        breakdown: [],
        totalBytes: 0,
        error: customRangeError
      });
      return;
    }

    const payload = toDbPayload(formData);
    if (!payload.company_name) {
      setSizeEstimate({
        breakdown: [],
        totalBytes: 0,
        error: "Select a Tally company before size estimation."
      });
      return;
    }

    try {
      const result = await estimateBackup(payload);
      setSizeEstimate({
        breakdown: Array.isArray(result.breakdown) ? result.breakdown : [],
        totalBytes: Number(result.totalBytes || 0),
        error: ""
      });
    } catch (error) {
      setSizeEstimate({
        breakdown: [],
        totalBytes: 0,
        error: error.message
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    const customRangeError = validateCustomRange();
    if (customRangeError) {
      setFormError(customRangeError);
      return;
    }

    const payload = toDbPayload(formData);
    if (!payload.name) {
      setFormError("Profile name is required.");
      return;
    }
    if (!payload.company_name) {
      setFormError("Tally company is required.");
      return;
    }
    if (!payload.local_path) {
      setFormError("Local backup path is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingProfile) {
        await invoke("updateProfile", editingProfile.id, payload);
      } else {
        await invoke("createProfile", payload);
      }
      await loadProfiles();
      resetForm();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this backup profile?")) {
      return;
    }

    setFormError("");
    try {
      await invoke("deleteProfile", id);
      await loadProfiles();
    } catch (error) {
      setFormError(error.message);
    }
  };

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Backup Profiles</h1>
        <div className="flex gap-2">
          <button type="button" onClick={loadProfiles} className="btn-secondary" disabled={loadingProfiles}>
            {loadingProfiles ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={isEditing ? resetForm : handleOpenCreate} className="btn-primary">
            {isEditing ? "Cancel" : "Add Profile"}
          </button>
        </div>
      </header>

      {isEditing && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Profile Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tally Company</label>
              {hasCompanyDropdown ? (
                <select
                  value={formData.tallyCompany}
                  onChange={(event) => {
                    const selectedName = event.target.value;
                    const selectedCompany = availableCompanies.find((item) => item.name === selectedName);
                    setFormData((prev) => ({
                      ...prev,
                      tallyCompany: selectedName,
                      companyId: selectedCompany?.id || ""
                    }));
                  }}
                  className="input"
                  required
                >
                  <option value="">Select company from Tally</option>
                  {formData.tallyCompany &&
                  !availableCompanies.some((company) => company.name === formData.tallyCompany) ? (
                    <option value={formData.tallyCompany}>{formData.tallyCompany}</option>
                  ) : null}
                  {availableCompanies.map((company) => (
                    <option key={`${company.id}-${company.name}`} value={company.name}>
                      {company.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.tallyCompany}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      tallyCompany: event.target.value,
                      companyId: ""
                    }))
                  }
                  className="input"
                  placeholder="Enter Tally company name"
                  required
                />
              )}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={loadCompanies}
                  disabled={loadingCompanies}
                >
                  {loadingCompanies ? "Loading..." : "Refresh Companies"}
                </button>
                {companyError ? <span className="text-sm text-red-800">{companyError}</span> : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date Range Mode</label>
              <select
                value={formData.dateRangeMode}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    dateRangeMode: event.target.value
                  }))
                }
                className="input"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formData.dateRangeMode === "incremental" ? (
                <p className="text-sm text-gray-600 mt-2">
                  First incremental run behaves like full backup, then next runs are incremental.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Schedule</label>
              <select
                value={formData.schedule}
                onChange={(event) => setFormData((prev) => ({ ...prev, schedule: event.target.value }))}
                className="input"
              >
                <option value="manual">Manual Only</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            {formData.dateRangeMode === "custom" ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Custom From Date</label>
                  <input
                    type="date"
                    value={formData.customFrom || ""}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, customFrom: event.target.value }))
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Custom To Date</label>
                  <input
                    type="date"
                    value={formData.customTo || ""}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, customTo: event.target.value }))
                    }
                    className="input"
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="block text-sm font-medium mb-2">Local Backup Folder</label>
              <input
                type="text"
                value={formData.localPath}
                onChange={(event) => setFormData((prev) => ({ ...prev, localPath: event.target.value }))}
                className="input"
                placeholder="C:\\Backups\\Tally"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Retention (Days)</label>
              <input
                type="number"
                min="1"
                value={formData.retentionDays}
                onChange={(event) => setFormData((prev) => ({ ...prev, retentionDays: event.target.value }))}
                className="input"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) => setFormData((prev) => ({ ...prev, is_active: event.target.checked }))}
                  className="mr-2"
                />
                Profile is active
              </label>
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={Boolean(formData.gdriveEnabled)}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, gdriveEnabled: event.target.checked }))
                  }
                  className="mr-2"
                />
                Sync this profile to Google Drive
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Selective Voucher / Master Data</label>
              <div className="grid grid-cols-3 gap-2">
                {DATA_TYPE_OPTIONS.map((dataType) => (
                  <label key={dataType} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={(formData.dataTypes || []).includes(dataType)}
                      onChange={(event) => toggleDataType(dataType, event.target.checked)}
                    />
                    {DATA_TYPE_LABELS[dataType] || dataType}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {formError ? <p className="mt-4 text-sm text-red-800">{formError}</p> : null}

          <div className="flex justify-end mt-4 gap-2">
            <button type="button" onClick={handleEstimateSize} className="btn-secondary" disabled={estimating}>
              {estimating ? "Estimating..." : "Estimate Backup Size"}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingProfile ? "Update Profile" : "Create Profile"}
            </button>
          </div>

          {estimating ? (
            <div className="flex items-center gap-2 mt-3">
              <span className="loading"></span>
              <span className="text-sm text-gray-600">Please wait... we are estimating backup size.</span>
            </div>
          ) : null}

          <div className="mt-4">
            <SizeEstimator
              breakdown={sizeEstimate.breakdown}
              totalBytes={sizeEstimate.totalBytes}
              loading={estimating}
              error={sizeEstimate.error}
              onRefresh={handleEstimateSize}
            />
          </div>
        </form>
      )}

      <div className="card">
        <h3>Existing Profiles</h3>
        {formError && !isEditing ? <p className="mt-2 text-sm text-red-800">{formError}</p> : null}
        <div className="mt-4">
          {sortedProfiles.length === 0 ? (
            <p className="text-gray-500">No backup profiles configured</p>
          ) : (
            <div className="space-y-4">
              {sortedProfiles.map((profile) => (
                <div key={profile.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{profile.name}</h4>
                      <p className="text-sm text-gray-600">{profile.tallyCompany}</p>
                      <p className="text-sm text-gray-500">{profile.localPath}</p>
                      <p className="text-sm text-gray-500">
                        Data Types: {(profile.dataTypes || ["Sales"]).map((type) => DATA_TYPE_LABELS[type] || type).join(", ")}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <StatusBadge
                          status={profile.is_active ? "success" : "warning"}
                          text={profile.is_active ? "Active" : "Inactive"}
                        />
                        <StatusBadge status="info" text={formatModeLabel(profile.dateRangeMode || profile.backupType)} />
                        <StatusBadge status="info" text={profile.schedule} />
                        <StatusBadge
                          status={profile.gdriveEnabled ? "success" : "warning"}
                          text={profile.gdriveEnabled ? "Drive Sync On" : "Drive Sync Off"}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleEdit(profile)} className="btn-secondary text-sm">
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(profile.id)}
                        className="btn-danger text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
