import React, { useState } from 'react';
import { useAppStore } from '../store';

export default function Settings() {
  const { settings, updateSettings } = useAppStore();
  const [formData, setFormData] = useState(settings);

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Settings</h1>
      </header>

      <form onSubmit={handleSubmit} className="card">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Tally Configuration</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Tally Port</label>
              <input
                type="number"
                value={formData.tallyPort}
                onChange={(e) => handleChange('tallyPort', parseInt(e.target.value))}
                className="input"
                min="9000"
                max="9999"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="input"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Backup Interval (minutes)</label>
              <input
                type="number"
                value={formData.backupInterval}
                onChange={(e) => handleChange('backupInterval', parseInt(e.target.value))}
                className="input"
                min="1"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Google Drive</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Folder ID</label>
              <input
                type="text"
                value={formData.gdriveFolderId}
                onChange={(e) => handleChange('gdriveFolderId', e.target.value)}
                className="input"
                placeholder="Enter Google Drive folder ID"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.autoSync}
                  onChange={(e) => handleChange('autoSync', e.target.checked)}
                  className="mr-2"
                />
                Auto-sync to Google Drive
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.notifications}
                  onChange={(e) => handleChange('notifications', e.target.checked)}
                  className="mr-2"
                />
                Enable notifications
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button type="submit" className="btn-primary">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}