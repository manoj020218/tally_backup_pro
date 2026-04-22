import React from 'react';

export default function BackupProgressBar({ progress, currentType }) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress || 0)));

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span>{currentType || 'Processing...'}</span>
        <span>{Math.round(safeProgress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${safeProgress}%` }}
        ></div>
      </div>
    </div>
  );
}
