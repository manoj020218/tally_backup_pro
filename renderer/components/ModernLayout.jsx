import React, { useState } from 'react';
import { useAppStore } from '../store';
import Sidebar from './Sidebar';
import ToastNotification from './ToastNotification';

export default function ModernLayout({ children, activeTab, onTabChange }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'profiles', label: 'Backup Profiles', icon: '💾' },
    { id: 'manual', label: 'Manual Backup', icon: '⚡' },
    { id: 'history', label: 'Backup History', icon: '📜' },
    { id: 'restore', label: 'Restore / Export', icon: '📦' },
    { id: 'drive', label: 'Google Drive Sync', icon: '☁️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="app-shell">
      <Sidebar 
        isOpen={sidebarOpen}
        items={navItems}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <main className="main-content">
        <div className="fade-in">
          {children}
        </div>
      </main>
      <ToastNotification />
    </div>
  );
}
