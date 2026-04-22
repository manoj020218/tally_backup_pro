const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: true,
  trimValues: true
});

function normalizeTag(tagName) {
  return String(tagName || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function deepCollectByTag(node, targetTags, output = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => deepCollectByTag(item, targetTags, output));
    return output;
  }
  if (!node || typeof node !== "object") {
    return output;
  }

  Object.entries(node).forEach(([key, value]) => {
    const normalized = normalizeTag(key);
    if (targetTags.has(normalized)) {
      output.push(...toArray(value));
    }
    deepCollectByTag(value, targetTags, output);
  });

  return output;
}

function deepCollectByTagWithTagName(node, targetTags, output = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => deepCollectByTagWithTagName(item, targetTags, output));
    return output;
  }
  if (!node || typeof node !== "object") {
    return output;
  }

  Object.entries(node).forEach(([key, value]) => {
    const normalized = normalizeTag(key);
    if (targetTags.has(normalized)) {
      toArray(value).forEach((item) => output.push({ tag: normalized, value: item }));
    }
    deepCollectByTagWithTagName(value, targetTags, output);
  });

  return output;
}

function firstNonEmpty(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function readObjectValue(source, keys) {
  if (!source || typeof source !== "object") return "";
  return firstNonEmpty(keys.map((key) => source[key]));
}

function parseCompanies(dataNode) {
  const companyObjects = deepCollectByTag(dataNode, new Set(["COMPANY"]));
  const parsed = companyObjects
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: firstNonEmpty([item.COMPANYID, item.GUID, item.MASTERID]),
      name: firstNonEmpty([item.NAME, item.COMPANYNAME]),
      mnemonic: firstNonEmpty([item.MNEMONIC])
    }))
    .filter((item) => item.name);

  if (parsed.length > 0) {
    const seen = new Set();
    return parsed.filter((item) => {
      const key = `${item.id || ""}|${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Fallback for response shapes that only include company names.
  const names = deepCollectByTag(dataNode, new Set(["NAME"]))
    .filter((item) => typeof item === "string" && item.trim())
    .map((name) => name.trim());

  const uniqueNames = [...new Set(names)];
  return uniqueNames.map((name) => ({
    id: "",
    name,
    mnemonic: ""
  }));
}

function parseVouchers(dataNode) {
  const voucherObjects = deepCollectByTag(dataNode, new Set(["VOUCHER"]));
  return voucherObjects
    .filter((item) => item && typeof item === "object")
    .map((voucher) => {
      const amountRaw = readObjectValue(voucher, ["AMOUNT"]);
      const amountValue = Number.parseFloat(String(amountRaw || ""));
      return {
        voucherNumber: readObjectValue(voucher, ["VOUCHERNUMBER", "VOUCHERNUMBER", "REFERENCE"]),
        date: readObjectValue(voucher, ["DATE"]),
        type: readObjectValue(voucher, ["VOUCHERTYPE", "VOUCHERTYPENAME"]),
        amount: Number.isFinite(amountValue) ? amountValue : 0,
        narration: readObjectValue(voucher, ["NARRATION"]),
        raw: voucher
      };
    });
}

function parseMasters(dataNode) {
  const masterItems = deepCollectByTagWithTagName(
    dataNode,
    new Set(["MASTER", "STOCKITEM", "LEDGER", "UNIT", "STOCKGROUP"])
  );

  return masterItems
    .map(({ tag, value }) => {
      if (value && typeof value === "object") {
        return {
          name: readObjectValue(value, ["NAME"]),
          code: readObjectValue(value, ["CODE", "GUID", "MASTERID"]),
          type: tag,
          raw: value
        };
      }
      if (typeof value === "string" && value.trim()) {
        return {
          name: value.trim(),
          code: "",
          type: tag,
          raw: value
        };
      }
      return null;
    })
    .filter(Boolean);
}

function parseXMLResponse(xmlData) {
  try {
    if (!xmlData) throw new Error("Empty XML response");

    const parsed = parser.parse(xmlData);
    const envelope = parsed.ENVELOPE || parsed.Envelope;
    if (!envelope) {
      throw new Error("Invalid Tally XML response structure");
    }

    const body = envelope.BODY || envelope.Body || {};
    const dataNode = body.DATA || body.Data || body.DESC || body.Desc || body;

    return {
      companies: parseCompanies(dataNode),
      vouchers: parseVouchers(dataNode),
      masters: parseMasters(dataNode),
      raw: dataNode
    };
  } catch (error) {
    throw new Error(`Failed to parse XML: ${error.message}`);
  }
}

module.exports = {
  parseXMLResponse,
  parseCompanies,
  parseVouchers,
  parseMasters
};
