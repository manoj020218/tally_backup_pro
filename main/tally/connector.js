const axios = require("axios");
const {
  buildCompanyListRequest,
  buildVoucherRequest,
  buildDayBookRequest,
  buildMasterRequest
} = require("./xml-builder");
const { parseXMLResponse } = require("./xml-parser");
const {
  resolveDataType,
  isTransactionType,
  isMasterType
} = require("./data-types");

const DEFAULT_TALLY_HOST = "127.0.0.1";
const DEFAULT_TALLY_PORT = 9000;
const DEFAULT_TIMEOUT_MS = 30000;
const DAY_BOOK_CACHE_TTL_MS = 60 * 1000;

const TRANSACTION_TYPE_MATCHERS = {
  sales: [/\bsales?\b/i],
  purchase: [/\bpurchase\b/i],
  receipt: [/\breceipt\b/i],
  payment: [/\bpayment\b/i],
  journal: [/\bjournal\b/i],
  "credit note": [/\bcredit\s*note\b/i, /\bcredit\b.*\bnote\b/i],
  "debit note": [/\bdebit\s*note\b/i, /\bdebit\b.*\bnote\b/i],
  "stock journal": [/\bstock\s*journal\b/i, /\bstock\b.*\bjournal\b/i, /\bjournal\b.*\bstock\b/i],
  "delivery note": [/\bdelivery\s*note\b/i, /\bdelivery\b.*\bnote\b/i]
};

const dayBookCache = new Map();

function normalizeForMatching(value) {
  return String(value || "").trim().toLowerCase();
}

function getVoucherTypeText(voucher = {}) {
  const raw = voucher.raw && typeof voucher.raw === "object" ? voucher.raw : {};
  const candidates = [
    voucher.voucherType,
    voucher.type,
    raw.VOUCHERTYPENAME,
    raw.VOUCHERTYPE,
    raw.VCHTYPE,
    raw.PARENT
  ];

  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }

  return "";
}

function shouldIncludeVoucherForDataType(voucher = {}, dataTypeId = "") {
  const normalizedType = normalizeForMatching(dataTypeId);
  const patterns = TRANSACTION_TYPE_MATCHERS[normalizedType];
  if (!patterns || patterns.length === 0) {
    return true;
  }

  const voucherTypeText = getVoucherTypeText(voucher);
  if (!voucherTypeText) {
    // If type is missing, keep the row instead of silently dropping data.
    return true;
  }

  return patterns.some((pattern) => pattern.test(voucherTypeText));
}

function makeDayBookCacheKey({ host, port, companyName, fromDate, toDate }) {
  return [host, port, companyName, fromDate, toDate].map((item) => String(item || "")).join("|");
}

function readDayBookCache(cacheKey) {
  const cached = dayBookCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() - cached.createdAt > DAY_BOOK_CACHE_TTL_MS) {
    dayBookCache.delete(cacheKey);
    return null;
  }

  return cached;
}

async function fetchDayBookData({ client, host, port, companyName, fromDate, toDate }) {
  const cacheKey = makeDayBookCacheKey({ host, port, companyName, fromDate, toDate });
  const cached = readDayBookCache(cacheKey);
  if (cached) return cached;

  const xmlRequest = buildDayBookRequest(fromDate, toDate, companyName);
  const xmlResponse = await postXml(client, xmlRequest);
  const parsed = parseXMLResponse(xmlResponse);
  const payload = {
    xmlRequest,
    xmlResponse,
    parsed,
    createdAt: Date.now()
  };

  dayBookCache.set(cacheKey, payload);
  return payload;
}

function buildTallyBaseUrl(host = DEFAULT_TALLY_HOST, port = DEFAULT_TALLY_PORT) {
  return `http://${host}:${port}`;
}

function createHttpClient(host, port, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return axios.create({
    baseURL: buildTallyBaseUrl(host, port),
    timeout: timeoutMs,
    responseType: "text",
    validateStatus: (status) => status >= 200 && status < 500
  });
}

async function postXml(client, xmlPayload) {
  const response = await client.post("/", xmlPayload, {
    headers: {
      "Content-Type": "text/xml",
      Accept: "text/xml"
    }
  });

  if (response.status >= 400) {
    const snippet = String(response.data || "").slice(0, 300);
    throw new Error(`Tally HTTP ${response.status}: ${snippet}`);
  }

  return response.data;
}

async function pingTally(port = DEFAULT_TALLY_PORT, host = DEFAULT_TALLY_HOST) {
  try {
    const client = createHttpClient(host, port, 8000);
    const xml = buildCompanyListRequest();
    const responseXml = await postXml(client, xml);
    const parsed = parseXMLResponse(responseXml);
    const companies = Array.isArray(parsed.companies) ? parsed.companies : [];

    return {
      connected: true,
      status: companies.length > 0 ? "CONNECTED" : "DEGRADED",
      companies,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      status: "DISCONNECTED",
      companies: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function getCompanyList(port = DEFAULT_TALLY_PORT, host = DEFAULT_TALLY_HOST) {
  const status = await pingTally(port, host);
  if (!status.connected) {
    throw new Error(status.error || "Tally server is not reachable.");
  }
  return status.companies;
}

function buildRequestXmlFromDataType({ dataType, companyName, fromDate, toDate }) {
  const typeDefinition = resolveDataType(dataType);
  if (!typeDefinition) {
    throw new Error(`Unsupported Tally data type: ${dataType}`);
  }

  if (isTransactionType(typeDefinition)) {
    if (!companyName) throw new Error("companyName is required for voucher export.");
    if (!fromDate || !toDate) {
      throw new Error("fromDate and toDate are required for transaction exports.");
    }

    return buildVoucherRequest(
      typeDefinition.tallyVoucherType || typeDefinition.id,
      fromDate,
      toDate,
      companyName
    );
  }

  if (isMasterType(typeDefinition)) {
    if (!companyName) throw new Error("companyName is required for master export.");
    return buildMasterRequest(typeDefinition.tallyCollectionId || typeDefinition.id, companyName);
  }

  throw new Error(`Cannot build XML for data type: ${dataType}`);
}

async function fetchTallyData({
  dataType,
  companyName,
  fromDate,
  toDate,
  host = DEFAULT_TALLY_HOST,
  port = DEFAULT_TALLY_PORT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  xml
}) {
  const typeDefinition = resolveDataType(dataType);
  const client = createHttpClient(host, port, timeoutMs);
  const requestXml =
    typeof xml === "string" && xml.trim()
      ? xml
      : buildRequestXmlFromDataType({
          dataType,
          companyName,
          fromDate,
          toDate
        });

  let effectiveRequestXml = requestXml;
  let responseXml = await postXml(client, requestXml);
  let parsed = parseXMLResponse(responseXml);
  let usedDayBookFallback = false;

  if (typeDefinition && isTransactionType(typeDefinition)) {
    const vouchers = Array.isArray(parsed.vouchers) ? parsed.vouchers : [];

    // Voucher Register can return no rows when user voucher type names differ
    // from predefined names (e.g. "Sale 2026-27"). Fall back to Day Book.
    if (vouchers.length === 0 && !(typeof xml === "string" && xml.trim())) {
      try {
        const dayBookData = await fetchDayBookData({
          client,
          host,
          port,
          companyName,
          fromDate,
          toDate
        });
        effectiveRequestXml = dayBookData.xmlRequest;
        responseXml = dayBookData.xmlResponse;
        parsed = dayBookData.parsed;
        usedDayBookFallback = true;
      } catch (_error) {
        // Keep original parsed result if Day Book fallback also fails.
      }
    }

    const filteredVouchers = (Array.isArray(parsed.vouchers) ? parsed.vouchers : []).filter((voucher) =>
      shouldIncludeVoucherForDataType(voucher, typeDefinition.id)
    );

    parsed = {
      ...parsed,
      vouchers: filteredVouchers
    };
  }

  return {
    ...parsed,
    xmlRequest: effectiveRequestXml,
    xmlResponse: responseXml,
    meta: {
      usedDayBookFallback
    }
  };
}

class TallyConnector {
  constructor(host = DEFAULT_TALLY_HOST, port = DEFAULT_TALLY_PORT, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.host = host;
    this.port = port;
    this.timeoutMs = timeoutMs;
  }

  async getStatus() {
    return pingTally(this.port, this.host);
  }

  async getCompanyList() {
    return getCompanyList(this.port, this.host);
  }

  async fetchData(dataType, options = {}) {
    if (typeof options === "string") {
      return fetchTallyData({
        dataType,
        host: this.host,
        port: this.port,
        timeoutMs: this.timeoutMs,
        xml: options
      });
    }

    return fetchTallyData({
      dataType,
      host: this.host,
      port: this.port,
      timeoutMs: this.timeoutMs,
      ...options
    });
  }
}

module.exports = {
  DEFAULT_TALLY_HOST,
  DEFAULT_TALLY_PORT,
  DEFAULT_TIMEOUT_MS,
  buildTallyBaseUrl,
  createHttpClient,
  postXml,
  pingTally,
  getCompanyList,
  buildRequestXmlFromDataType,
  fetchTallyData,
  TallyConnector
};
