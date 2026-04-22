import React, { useMemo, useState } from "react";

const EMPTY_PROFILE = {
  name: "",
  tallyCompany: "",
  backupType: "full",
  schedule: "daily",
  is_active: true,
  localPath: "",
  compression: true
};

export default function ProfileEditor({
  initialProfile = null,
  onSave = () => {},
  onCancel = () => {}
}) {
  const startingState = useMemo(
    () => ({
      ...EMPTY_PROFILE,
      ...(initialProfile || {})
    }),
    [initialProfile]
  );

  const [formData, setFormData] = useState(startingState);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(formData);
  }

  return (
    <div className="container">
      <header className="card card-header">
        <h1>{initialProfile ? "Edit Profile" : "Create Profile"}</h1>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Profile Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tally Company</label>
            <input
              type="text"
              value={formData.tallyCompany}
              onChange={(e) => updateField("tallyCompany", e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Backup Type</label>
            <select
              value={formData.backupType}
              onChange={(e) => updateField("backupType", e.target.value)}
              className="input"
            >
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Schedule</label>
            <select
              value={formData.schedule}
              onChange={(e) => updateField("schedule", e.target.value)}
              className="input"
            >
              <option value="manual">Manual</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Local Path</label>
            <input
              type="text"
              value={formData.localPath}
              onChange={(e) => updateField("localPath", e.target.value)}
              className="input"
              placeholder="C:\\TallyBackups\\"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={Boolean(formData.compression)}
                onChange={(e) => updateField("compression", e.target.checked)}
                className="mr-2"
              />
              Enable Compression
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}

