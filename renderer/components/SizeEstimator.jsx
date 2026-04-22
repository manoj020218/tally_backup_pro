import React from "react";

function formatEstimate(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** unitIndex;
  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

export default function SizeEstimator({
  breakdown = [],
  totalBytes = 0,
  loading = false,
  error = "",
  onRefresh = null
}) {
  return (
    <div className="card">
      <div className="flex justify-between items-center">
        <h3>Size Estimate</h3>
        {typeof onRefresh === "function" ? (
          <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? "Calculating..." : "Refresh Estimate"}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}

      {breakdown.length === 0 ? (
        <p className="text-sm text-gray-500 mt-3">No estimate data available.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Data Type</th>
                <th className="text-left py-2">Records</th>
                <th className="text-left py-2">Estimated Size</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row, index) => (
                <tr key={`${row.dataType || "type"}_${index}`} className="border-b">
                  <td className="py-2">{row.dataType || "Unknown"}</td>
                  <td className="py-2">{Number(row.recordCount || 0)}</td>
                  <td className="py-2">{formatEstimate(row.estimatedBytes || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm font-medium">
        Total Estimated Size: {formatEstimate(totalBytes)}
      </div>
    </div>
  );
}

