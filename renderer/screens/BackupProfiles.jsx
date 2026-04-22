import React, { useState } from 'react';
import { useAppStore } from '../store';
import StatusBadge from '../components/StatusBadge';

export default function BackupProfiles() {
  const { backupProfiles, addBackupProfile, updateBackupProfile, deleteBackupProfile } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    tallyCompany: '',
    backupType: 'full',
    schedule: 'daily',
    is_active: true,
    localPath: '',
    compression: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingProfile) {
      updateBackupProfile(editingProfile.id, formData);
    } else {
      addBackupProfile(formData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      tallyCompany: '',
      backupType: 'full',
      schedule: 'daily',
      is_active: true,
      localPath: '',
      compression: true
    });
    setIsEditing(false);
    setEditingProfile(null);
  };

  const handleEdit = (profile) => {
    setFormData(profile);
    setEditingProfile(profile);
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this backup profile?')) {
      deleteBackupProfile(id);
    }
  };

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Backup Profiles</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="btn-primary"
        >
          {isEditing ? 'Cancel' : 'Add Profile'}
        </button>
      </header>

      {isEditing && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Profile Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tally Company</label>
              <input
                type="text"
                value={formData.tallyCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, tallyCompany: e.target.value }))}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Backup Type</label>
              <select
                value={formData.backupType}
                onChange={(e) => setFormData(prev => ({ ...prev, backupType: e.target.value }))}
                className="input"
              >
                <option value="full">Full Backup</option>
                <option value="incremental">Incremental Backup</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Schedule</label>
              <select
                value={formData.schedule}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                className="input"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Local Path</label>
              <input
                type="text"
                value={formData.localPath}
                onChange={(e) => setFormData(prev => ({ ...prev, localPath: e.target.value }))}
                className="input"
                placeholder="C:\\Backups\\"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.compression}
                  onChange={(e) => setFormData(prev => ({ ...prev, compression: e.target.checked }))}
                  className="mr-2"
                />
                Enable Compression
              </label>
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingProfile ? 'Update' : 'Create'} Profile
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <h3>Existing Profiles</h3>
        <div className="mt-4">
          {backupProfiles.length === 0 ? (
            <p className="text-gray-500">No backup profiles configured</p>
          ) : (
            <div className="space-y-4">
              {backupProfiles.map(profile => (
                <div key={profile.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{profile.name}</h4>
                      <p className="text-sm text-gray-600">{profile.tallyCompany}</p>
                      <div className="flex gap-2 mt-2">
                        <StatusBadge
                          status={profile.is_active ? 'success' : 'warning'}
                          text={profile.is_active ? 'Active' : 'Inactive'}
                        />
                        <StatusBadge
                          status="info"
                          text={profile.backupType}
                        />
                        <StatusBadge
                          status="info"
                          text={profile.schedule}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(profile)}
                        className="btn-secondary text-sm"
                      >
                        Edit
                      </button>
                      <button
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