import React from "react";

const PRESET_OPTIONS = [
  "today",
  "yesterday",
  "thisWeek",
  "last7Days",
  "thisMonth",
  "lastMonth",
  "thisFinancialYear",
  "custom",
  "sinceLastBackup"
];

export default function DateRangePicker({
  value = {},
  onChange = () => {}
}) {
  const mode = value.mode || "preset";
  const preset = value.preset || "last7Days";
  const fromDate = value.fromDate || "";
  const toDate = value.toDate || "";

  function update(patch) {
    onChange({
      ...value,
      ...patch
    });
  }

  return (
    <div className="card">
      <h3>Date Range</h3>

      <div className="mt-3">
        <label className="block text-sm font-medium mb-2">Mode</label>
        <select
          className="input"
          value={mode}
          onChange={(event) => update({ mode: event.target.value })}
        >
          <option value="preset">Preset</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {mode === "preset" ? (
        <div className="mt-3">
          <label className="block text-sm font-medium mb-2">Preset</label>
          <select
            className="input"
            value={preset}
            onChange={(event) => update({ preset: event.target.value })}
          >
            {PRESET_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium mb-2">From</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={(event) => update({ fromDate: event.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To</label>
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={(event) => update({ toDate: event.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

