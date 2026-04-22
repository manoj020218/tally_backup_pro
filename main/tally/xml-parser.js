const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true
});

function parseXMLResponse(xmlData) {
  try {
    if (!xmlData) throw new Error('Empty XML response');
    
    const parsed = parser.parse(xmlData);
    
    if (!parsed.ENVELOPE) {
      throw new Error('Invalid Tally XML response structure');
    }

    const body = parsed.ENVELOPE.BODY || {};
    const data = body.DATA || {};

    return {
      companies: parseCompanies(data),
      vouchers: parseVouchers(data),
      masters: parseMasters(data),
      raw: data
    };
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error(\`Failed to parse XML: \${error.message}\`);
  }
}

function parseCompanies(data) {
  if (!data.COMPANY) return [];
  const companies = Array.isArray(data.COMPANY) ? data.COMPANY : [data.COMPANY];
  return companies.map(c => ({
    id: c.COMPANYID,
    name: c.NAME,
    mnemonic: c.MNEMONIC
  }));
}

function parseVouchers(data) {
  if (!data.VOUCHER) return [];
  const vouchers = Array.isArray(data.VOUCHER) ? data.VOUCHER : [data.VOUCHER];
  return vouchers.map(v => ({
    voucherNumber: v.VOUCHERNUMBER,
    date: v.DATE,
    type: v.VOUCHERTYPE,
    amount: v.AMOUNT,
    narration: v.NARRATION,
    raw: v
  }));
}

function parseMasters(data) {
  if (!data.MASTER) return [];
  const masters = Array.isArray(data.MASTER) ? data.MASTER : [data.MASTER];
  return masters.map(m => ({
    name: m.NAME,
    code: m.CODE,
    type: m.TYPE,
    raw: m
  }));
}

module.exports = {
  parseXMLResponse,
  parseCompanies,
  parseVouchers,
  parseMasters
};
