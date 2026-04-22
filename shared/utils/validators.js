function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPort(value) {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isValidISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isValidTallyDate(value) {
  return /^\d{8}$/.test(String(value || ""));
}

function isValidDate(value) {
  return isValidISODate(value) || isValidTallyDate(value);
}

function validateDateRange(fromDate, toDate) {
  if (!isValidDate(fromDate) || !isValidDate(toDate)) {
    return {
      valid: false,
      error: "Invalid date format"
    };
  }

  const normalize = (date) => {
    if (isValidTallyDate(date)) {
      return new Date(
        Number.parseInt(date.slice(0, 4), 10),
        Number.parseInt(date.slice(4, 6), 10) - 1,
        Number.parseInt(date.slice(6, 8), 10)
      );
    }
    return new Date(date);
  };

  const from = normalize(String(fromDate));
  const to = normalize(String(toDate));

  if (from.getTime() > to.getTime()) {
    return {
      valid: false,
      error: "fromDate cannot be after toDate"
    };
  }

  return { valid: true };
}

function validateLicenseKey(value) {
  const key = String(value || "").trim().toUpperCase();
  const pattern = /^TBP-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/;
  return pattern.test(key);
}

function validateBackupProfileInput(profile = {}) {
  const errors = [];

  if (!isNonEmptyString(profile.name)) {
    errors.push("Profile name is required.");
  }
  if (!isNonEmptyString(profile.companyName || profile.company_name || profile.tallyCompany)) {
    errors.push("Company name is required.");
  }
  if (!Array.isArray(profile.dataTypes || profile.data_types) || (profile.dataTypes || profile.data_types).length === 0) {
    errors.push("At least one data type is required.");
  }
  if (!isValidPort(profile.tallyPort || profile.tally_port || 9000)) {
    errors.push("Invalid Tally port.");
  }

  if (
    (profile.customFrom || profile.custom_from) &&
    (profile.customTo || profile.custom_to)
  ) {
    const result = validateDateRange(
      profile.customFrom || profile.custom_from,
      profile.customTo || profile.custom_to
    );
    if (!result.valid) {
      errors.push(result.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  isNonEmptyString,
  isValidPort,
  isValidISODate,
  isValidTallyDate,
  isValidDate,
  validateDateRange,
  validateLicenseKey,
  validateBackupProfileInput
};

