import React, { useEffect, useState } from "react";
import { useAppStore } from "../store";
import { useIPC } from "../hooks/useElectron";

const DEFAULT_FORM = {
  tallyPort: 9000,
  tallyDataPath: "",
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

export default function Settings() {
  const { settings, updateSettings } = useAppStore();
  const { invoke } = useIPC();

  const [formData, setFormData] = useState({ ...DEFAULT_FORM, ...settings });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [licenseStatus, setLicenseStatus] = useState(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [validatingLicense, setValidatingLicense] = useState(false);

  async function refreshSettingsAndLicense() {
    setLoading(true);
    setError("");
    try {
      const [backendSettings, backendLicenseStatus] = await Promise.all([
        invoke("getSettings"),
        invoke("getLicenseStatus")
      ]);

      const nextSettings = { ...DEFAULT_FORM, ...backendSettings };
      updateSettings(nextSettings);
      setFormData(nextSettings);
      setLicenseStatus(backendLicenseStatus || null);
    } catch (loadError) {
      setError(`Failed to load settings: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSettingsAndLicense();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const saved = await invoke("updateSettings", formData);
      const nextSettings = { ...DEFAULT_FORM, ...saved };
      updateSettings(nextSettings);
      setFormData(nextSettings);
      setMessage("Settings saved successfully.");
    } catch (saveError) {
      setError(`Failed to save settings: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleValidateLicense = async () => {
    const key = String(licenseKeyInput || "").trim();
    if (!key) {
      setError("Enter a license key before validating.");
      return;
    }

    setValidatingLicense(true);
    setMessage("");
    setError("");
    try {
      const result = await invoke("validateLicense", key);
      if (result?.valid) {
        setMessage("License validated successfully.");
      } else {
        setMessage("License response received, but validity could not be confirmed.");
      }

      const refreshed = await invoke("getLicenseStatus");
      setLicenseStatus(refreshed || null);
      setLicenseKeyInput("");
    } catch (licenseError) {
      setError(`License validation failed: ${licenseError.message}`);
    } finally {
      setValidatingLicense(false);
    }
  };

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Settings</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={refreshSettingsAndLicense}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Application</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">App Version</label>
              <input
                type="text"
                value={formData.appVersion || "1.0.0"}
                className="input"
                disabled
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Update Channel</label>
              <select
                className="input"
                value={formData.updateChannel || "stable"}
                onChange={(event) => handleChange("updateChannel", event.target.value)}
              >
                <option value="stable">Stable</option>
                <option value="beta">Beta</option>
                <option value="hotfix">Hotfix</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={Boolean(formData.startOnBoot)}
                  onChange={(event) => handleChange("startOnBoot", event.target.checked)}
                  className="mr-2"
                />
                Start app on Windows login
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Tally Configuration</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tally Port</label>
              <input
                type="number"
                value={formData.tallyPort}
                onChange={(event) =>
                  handleChange("tallyPort", Number.parseInt(event.target.value || "9000", 10))
                }
                className="input"
                min="1"
                max="65535"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tally Data Location (.900 files)</label>
              <input
                type="text"
                value={formData.tallyDataPath || ""}
                onChange={(event) => handleChange("tallyDataPath", event.target.value)}
                className="input"
                placeholder="C:\\TallyPrime\\Data"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={Boolean(formData.fallback900Enabled)}
                  onChange={(event) => handleChange("fallback900Enabled", event.target.checked)}
                  className="mr-2"
                />
                Enable .900 fallback backup when Tally XML is disconnected
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Google Drive</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Folder ID</label>
              <input
                type="text"
                value={formData.gdriveFolderId || ""}
                onChange={(event) => handleChange("gdriveFolderId", event.target.value)}
                className="input"
                placeholder="Enter Google Drive folder ID"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">OAuth Client ID</label>
              <input
                type="text"
                value={formData.gdriveClientId || ""}
                onChange={(event) => handleChange("gdriveClientId", event.target.value)}
                className="input"
                placeholder="your-client-id.apps.googleusercontent.com"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">OAuth Client Secret</label>
              <input
                type="password"
                value={formData.gdriveClientSecret || ""}
                onChange={(event) => handleChange("gdriveClientSecret", event.target.value)}
                className="input"
                placeholder="Enter client secret"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">OAuth Redirect URI</label>
              <input
                type="text"
                value={formData.gdriveRedirectUri || ""}
                onChange={(event) => handleChange("gdriveRedirectUri", event.target.value)}
                className="input"
                placeholder="http://127.0.0.1:3478/oauth2callback"
              />
              <p className="text-sm text-gray-600 mt-2">
                You can keep dummy OAuth values during setup. Replace with real Google Web Client credentials before
                production cloud sync.
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={Boolean(formData.autoSync)}
                  onChange={(event) => handleChange("autoSync", event.target.checked)}
                  className="mr-2"
                />
                Auto-sync to Google Drive
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Notifications & License</h3>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={Boolean(formData.notifications)}
                  onChange={(event) => handleChange("notifications", event.target.checked)}
                  className="mr-2"
                />
                Enable notifications
              </label>
            </div>

            <div className="mb-4">
              <p className="text-sm">
                <strong>License Status:</strong>{" "}
                {licenseStatus?.configured ? "Configured" : "Not Configured"}
              </p>
              <p className="text-sm">
                <strong>Tier:</strong> {licenseStatus?.tier || "N/A"}
              </p>
              <p className="text-sm">
                <strong>Expires:</strong> {licenseStatus?.expiresAt || "N/A"}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Activate / Validate License Key</label>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(event) => setLicenseKeyInput(event.target.value)}
                className="input"
                placeholder="TBP-XXXX-XXXX-XXXX-XXXX"
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleValidateLicense}
              disabled={validatingLicense}
            >
              {validatingLicense ? "Validating..." : "Validate License"}
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 text-sm text-green-800">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-800">{error}</p> : null}

        <div className="flex justify-end mt-6">
          <button type="submit" className="btn-primary" disabled={saving || loading}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
