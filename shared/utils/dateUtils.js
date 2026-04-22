function parseInputDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("Invalid date");
    return new Date(value.getTime());
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Tally format: YYYYMMDD
    if (/^\d{8}$/.test(trimmed)) {
      const year = Number.parseInt(trimmed.slice(0, 4), 10);
      const month = Number.parseInt(trimmed.slice(4, 6), 10) - 1;
      const day = Number.parseInt(trimmed.slice(6, 8), 10);
      const date = new Date(year, month, day);
      if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
      return date;
    }

    // ISO-like or locale-compatible date string
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) throw new Error("Invalid date");
    return parsed;
  }

  throw new Error("Invalid date input");
}

function toISODate(input) {
  const date = parseInputDate(input);
  return date.toISOString().slice(0, 10);
}

function formatTallyDate(input) {
  const date = parseInputDate(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function addDays(input, days, output = "iso") {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    throw new Error("days must be a valid number");
  }

  const date = parseInputDate(input);
  date.setDate(date.getDate() + days);

  if (output === "tally") {
    return formatTallyDate(date);
  }
  return toISODate(date);
}

function getFinancialYear(input) {
  const date = parseInputDate(input);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month >= 4) {
    return {
      from: `${year}-04-01`,
      to: `${year + 1}-03-31`,
      year: `${year}-${year + 1}`
    };
  }

  return {
    from: `${year - 1}-04-01`,
    to: `${year}-03-31`,
    year: `${year - 1}-${year}`
  };
}

function getStartOfWeekMonday(date) {
  const copy = parseInputDate(date);
  const day = copy.getDay(); // 0 = Sunday
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function getEndOfMonth(date) {
  const copy = parseInputDate(date);
  return new Date(copy.getFullYear(), copy.getMonth() + 1, 0);
}

function getDateRangePreset(preset, baseDate = new Date()) {
  const today = parseInputDate(baseDate);
  const todayIso = toISODate(today);

  const thisWeekStart = toISODate(getStartOfWeekMonday(today));
  const thisMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
  const lastMonthEnd = toISODate(getEndOfMonth(lastMonthDate));

  const fy = getFinancialYear(today);
  const currentFyStartYear = Number.parseInt(fy.from.slice(0, 4), 10);
  const lastFy = {
    from: `${currentFyStartYear - 1}-04-01`,
    to: `${currentFyStartYear}-03-31`
  };

  const ranges = {
    today: {
      from: todayIso,
      to: todayIso
    },
    yesterday: {
      from: addDays(todayIso, -1),
      to: addDays(todayIso, -1)
    },
    thisWeek: {
      from: thisWeekStart,
      to: todayIso
    },
    last7Days: {
      from: addDays(todayIso, -7),
      to: todayIso
    },
    last30Days: {
      from: addDays(todayIso, -30),
      to: todayIso
    },
    thisMonth: {
      from: thisMonthStart,
      to: todayIso
    },
    lastMonth: {
      from: lastMonthStart,
      to: lastMonthEnd
    },
    thisFinancialYear: {
      from: fy.from,
      to: todayIso
    },
    lastFinancialYear: {
      from: lastFy.from,
      to: lastFy.to
    }
  };

  if (!ranges[preset]) {
    throw new Error(`Unknown preset: ${preset}`);
  }

  return ranges[preset];
}

module.exports = {
  parseInputDate,
  toISODate,
  formatTallyDate,
  addDays,
  getFinancialYear,
  getDateRangePreset
};

