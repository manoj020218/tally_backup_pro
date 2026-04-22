import React from "react";
import StatusBadge from "./StatusBadge";

export default function TallyStatusBar({
  status = { connected: false, companies: [] },
  loading = false,
  onRefresh = null
}) {
  return (
    <div className="card flex justify-between items-center">
      <div>
        <h3>Tally Status</h3>
        <div className="mt-2">
          <StatusBadge
            status={status.connected ? "success" : "danger"}
            text={status.connected ? "Connected" : "Disconnected"}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Companies: {Array.isArray(status.companies) ? status.companies.length : 0}
        </p>
        {status.error ? <p className="text-sm text-red-600 mt-1">{status.error}</p> : null}
      </div>
      {typeof onRefresh === "function" ? (
        <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Checking..." : "Refresh"}
        </button>
      ) : null}
    </div>
  );
}

