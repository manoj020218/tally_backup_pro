import React, { useState } from 'react';
import { useAppStore } from '../store';
import StatusBadge from '../components/StatusBadge';

export default function BackupHistory() {
  const { backupHistory, clearBackupHistory } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistory = backupHistory.filter(backup => {
    const matchesFilter = filter === 'all' || backup.status === filter;
    const matchesSearch = backup.profile_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all backup history?')) {
      clearBackupHistory();
    }
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const duration = new Date(end) - new Date(start);
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `\${minutes}m \${seconds}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Backup History</h1>
        <button onClick={handleClearHistory} className="btn-danger">
          Clear History
        </button>
      </header>

      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Search Profiles</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              placeholder="Search by profile name..."
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Profile</th>
                <th className="text-left py-3 px-4">Started</th>
                <th className="text-left py-3 px-4">Duration</th>
                <th className="text-left py-3 px-4">Size</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No backup history found
                  </td>
                </tr>
              ) : (
                filteredHistory.map(backup => (
                  <tr key={backup.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{backup.profile_name}</div>
                        <div className="text-sm text-gray-500">{backup.backup_type}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {new Date(backup.started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {formatDuration(backup.started_at, backup.completed_at)}
                    </td>
                    <td className="py-3 px-4">
                      {formatFileSize(backup.file_size)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={
                          backup.status === 'success' ? 'success' :
                          backup.status === 'failed' ? 'danger' :
                          backup.status === 'running' ? 'warning' : 'info'
                        }
                        text={backup.status}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">
                          View Details
                        </button>
                        {backup.log_file && (
                          <button className="text-gray-600 hover:text-gray-800 text-sm">
                            View Log
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}