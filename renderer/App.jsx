import React, { useEffect, useState } from 'react';
import ModernDashboard from './screens/ModernDashboard';
import ModernBackupProfiles from './screens/ModernBackupProfiles';
import ModernBackupHistory from './screens/ModernBackupHistory';
import ModernManualBackup from './screens/ModernManualBackup';
import ModernGoogleDrive from './screens/ModernGoogleDrive';
import ModernRestore from './screens/ModernRestore';
import ModernSettings from './screens/ModernSettings';
import { useIPC } from './hooks/useElectron';
import { useAppStore } from './store';
import ModernLayout from './components/ModernLayout';

function renderScreen(activeTab) {
  if (activeTab === 'profiles') return <ModernBackupProfiles />;
  if (activeTab === 'manual') return <ModernManualBackup />;
  if (activeTab === 'history') return <ModernBackupHistory />;
  if (activeTab === 'restore') return <ModernRestore />;
  if (activeTab === 'drive') return <ModernGoogleDrive />;
  if (activeTab === 'settings') return <ModernSettings />;
  return <ModernDashboard />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { invoke } = useIPC();
  const setBackupProfiles = useAppStore((state) => state.setBackupProfiles);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setGdriveStatus = useAppStore((state) => state.setGdriveStatus);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialState() {
      try {
        const [profiles, settings, driveStatus] = await Promise.all([
          invoke("getProfiles"),
          invoke("getSettings"),
          invoke("getDriveStatus")
        ]);

        if (cancelled) return;

        if (Array.isArray(profiles)) {
          setBackupProfiles(profiles);
        }
        if (settings && typeof settings === "object") {
          updateSettings(settings);
        }
        if (driveStatus && typeof driveStatus === "object") {
          setGdriveStatus(driveStatus);
        }
      } catch (error) {
        console.error("Failed to load app state:", error.message);
      }
    }

    loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [invoke, setBackupProfiles, setGdriveStatus, updateSettings]);

  return (
    <ModernLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderScreen(activeTab)}
    </ModernLayout>
  );
}
