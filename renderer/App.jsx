import React, { useEffect, useState } from 'react';
import Dashboard from './screens/Dashboard';
import BackupProfiles from './screens/BackupProfiles';
import BackupHistory from './screens/BackupHistory';
import ManualBackup from './screens/ManualBackup';
import GoogleDrive from './screens/GoogleDrive';
import Restore from './screens/Restore';
import Settings from './screens/Settings';
import { useIPC } from './hooks/useElectron';
import { useAppStore } from './store';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'profiles', label: 'Backup Profiles' },
  { id: 'manual', label: 'Manual Backup' },
  { id: 'history', label: 'Backup History' },
  { id: 'restore', label: 'Restore / Export' },
  { id: 'drive', label: 'Google Drive Sync' },
  { id: 'settings', label: 'Settings' }
];

function renderScreen(activeTab) {
  if (activeTab === 'profiles') return <BackupProfiles />;
  if (activeTab === 'manual') return <ManualBackup />;
  if (activeTab === 'history') return <BackupHistory />;
  if (activeTab === 'restore') return <Restore />;
  if (activeTab === 'drive') return <GoogleDrive />;
  if (activeTab === 'settings') return <Settings />;
  return <Dashboard />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { invoke } = useIPC();
  const setBackupProfiles = useAppStore((state) => state.setBackupProfiles);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      try {
        const profiles = await invoke("getProfiles");
        if (!cancelled && Array.isArray(profiles)) {
          setBackupProfiles(profiles);
        }
      } catch (error) {
        console.error("Failed to load profiles:", error.message);
      }
    }

    loadProfiles();
    return () => {
      cancelled = true;
    };
  }, [invoke, setBackupProfiles]);

  return (
    <div className="app-shell">
      <div className="app-nav-wrap">
        <div className="container">
          <div className="app-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {renderScreen(activeTab)}
    </div>
  );
}
