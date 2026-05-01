import React, { useState } from 'react';
import { useAppStore } from '../store';
import ModernInput from '../components/ModernInput';
import ModernModal from '../components/ModernModal';
import ActionCard from '../components/ActionCard';

export default function ModernBackupProfiles() {
  const {
    backupProfiles,
    setBackupProfiles,
    updateBackupProfile,
    deleteBackupProfile,
    createBackupProfile
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    backupType: 'incremental',
    schedule: 'daily',
    is_active: true
  });

  const handleOpenModal = (profile = null) => {
    if (profile) {
      setSelectedProfile(profile);
      setFormData({
        name: profile.name,
        path: profile.path,
        backupType: profile.backupType,
        schedule: profile.schedule || 'daily',
        is_active: profile.is_active
      });
      setIsEditMode(true);
    } else {
      setFormData({
        name: '',
        path: '',
        backupType: 'incremental',
        schedule: 'daily',
        is_active: true
      });
      setIsEditMode(false);
    }
    setIsModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      alert('Profile name is required');
      return;
    }

    if (isEditMode && selectedProfile) {
      await updateBackupProfile(selectedProfile.id, formData);
    } else {
      await createBackupProfile(formData);
    }

    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const handleDeleteProfile = (profileId) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      deleteBackupProfile(profileId);
    }
  };

  const handleToggleActive = (profile) => {
    updateBackupProfile(profile.id, { ...profile, is_active: !profile.is_active });
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Backup Profiles</h1>
            <p className="page-description">Create and manage your backup configurations</p>
          </div>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            ➕ New Profile
          </button>
        </div>
      </div>

      {/* Profiles Grid */}
      {backupProfiles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📋</p>
          <h3 style={{ marginBottom: '0.5rem' }}>No Backup Profiles Yet</h3>
          <p style={{ color: 'var(--neutral-600)', marginBottom: '1.5rem' }}>
            Create your first backup profile to get started
          </p>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            Create Your First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {backupProfiles.map((profile) => (
            <ActionCard
              key={profile.id}
              icon={profile.is_active ? '✅' : '⏸️'}
              title={profile.name}
              description={`${profile.backupType} • Every ${profile.schedule}`}
              status={profile.is_active ? 'success' : 'idle'}
              isActive={true}
              onAction={() => handleOpenModal(profile)}
              actionLabel="Edit Profile"
              actionVariant="secondary"
            />
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      <ModernModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? 'Edit Profile' : 'New Backup Profile'}
        size="md"
        footer={
          <>
            {isEditMode && (
              <button
                className="btn-danger"
                onClick={() => {
                  handleDeleteProfile(selectedProfile.id);
                  setIsModalOpen(false);
                }}
              >
                🗑️ Delete
              </button>
            )}
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSaveProfile}>
              {isEditMode ? 'Save Changes' : 'Create Profile'}
            </button>
          </>
        }
      >
        <ModernInput
          label="Profile Name"
          placeholder="e.g., Daily Backup"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          icon="📝"
        />

        <ModernInput
          label="Backup Path"
          placeholder="e.g., /path/to/data"
          value={formData.path}
          onChange={(e) => setFormData({ ...formData, path: e.target.value })}
          icon="📂"
          helperText="Leave empty for default path"
        />

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--neutral-900)'
          }}>
            Backup Type
          </label>
          <select
            value={formData.backupType}
            onChange={(e) => setFormData({ ...formData, backupType: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--neutral-200)',
              fontSize: '0.9375rem'
            }}
          >
            <option value="full">Full Backup</option>
            <option value="incremental">Incremental Backup</option>
            <option value="differential">Differential Backup</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--neutral-900)'
          }}>
            Schedule
          </label>
          <select
            value={formData.schedule}
            onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--neutral-200)',
              fontSize: '0.9375rem'
            }}
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--neutral-50)',
          cursor: 'pointer'
        }}
        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
        >
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label style={{ cursor: 'pointer', fontWeight: 500 }}>
            Activate this profile
          </label>
        </div>
      </ModernModal>
    </div>
  );
}
