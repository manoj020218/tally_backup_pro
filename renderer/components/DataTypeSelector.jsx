import React from "react";

const DEFAULT_TYPES = {
  transactions: [
    "Sales",
    "Purchase",
    "Receipt",
    "Payment",
    "Journal",
    "Credit Note",
    "Debit Note"
  ],
  masters: ["STOCKITEM", "LEDGER", "UNIT", "STOCKGROUP"]
};

export default function DataTypeSelector({
  selectedTypes = [],
  availableTypes = DEFAULT_TYPES,
  onChange = () => {}
}) {
  function toggleType(type) {
    const exists = selectedTypes.includes(type);
    if (exists) {
      onChange(selectedTypes.filter((item) => item !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  }

  function renderGroup(title, items) {
    return (
      <div className="card">
        <h4 className="font-medium">{title}</h4>
        <div className="mt-3 grid gap-2">
          {items.map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-2">Data Types</h3>
      <div className="grid grid-cols-2 gap-4">
        {renderGroup("Transaction Data", availableTypes.transactions || [])}
        {renderGroup("Master Data", availableTypes.masters || [])}
      </div>
    </div>
  );
}

