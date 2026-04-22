function formatTallyDate(date) {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  } catch (error) {
    throw new Error(\`Invalid date format: \${date}\`);
  }
}

function getFinancialYear(date) {
  if (!date) throw new Error('Date is required');
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    if (month >= 4) {
      return {
        from: \`\${year}-04-01\`,
        to: \`\${year + 1}-03-31\`,
        year: \`\${year}-\${year + 1}\`
      };
    }
    return {
      from: \`\${year - 1}-04-01\`,
      to: \`\${year}-03-31\`,
      year: \`\${year - 1}-\${year}\`
    };
  } catch (error) {
    throw new Error(\`Failed to get financial year: \${error.message}\`);
  }
}

function addDays(dateStr, days) {
  try {
    if (!dateStr || typeof days !== 'number') throw new Error('Invalid parameters');
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  } catch (error) {
    throw new Error(\`Date calculation failed: \${error.message}\`);
  }
}

function getDateRangePreset(preset, baseDate) {
  const today = baseDate instanceof Date ? baseDate : new Date(baseDate);
  if (isNaN(today.getTime())) throw new Error('Invalid date');

  const ranges = {
    last7Days: {
      from: addDays(today.toISOString().slice(0, 10), -7),
      to: today.toISOString().slice(0, 10)
    },
    last30Days: {
      from: addDays(today.toISOString().slice(0, 10), -30),
      to: today.toISOString().slice(0, 10)
    },
    thisMonth: {
      from: \`\${today.getFullYear()}-\${String(today.getMonth() + 1).padStart(2, '0')}-01\`,
      to: today.toISOString().slice(0, 10)
    },
    lastMonth: {
      from: \`\${today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()}-\${String(today.getMonth() === 0 ? 12 : today.getMonth()).padStart(2, '0')}-01\`,
      to: \`\${today.getFullYear()}-\${String(today.getMonth() + 1).padStart(2, '0')}-01\`
    },
    thisFinancialYear: (() => {
      const fy = getFinancialYear(today);
      const toMonth = today.getMonth() + 1;
      const toDay = today.getDate();
      return {
        from: fy.from,
        to: \`\${today.getFullYear()}-\${String(toMonth).padStart(2, '0')}-\${String(toDay).padStart(2, '0')}\`
      };
    })()
  };

  if (!ranges[preset]) throw new Error(\`Unknown preset: \${preset}\`);
  return ranges[preset];
}

module.exports = {
  formatTallyDate,
  getFinancialYear,
  addDays,
  getDateRangePreset
};
