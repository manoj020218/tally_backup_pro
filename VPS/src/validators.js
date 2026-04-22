const { z } = require("zod");
const { AppError } = require("./errors");

const validateLicenseSchema = z.object({
  licenseKey: z.string().min(8),
  fingerprint: z.string().min(8),
  appVersion: z.string().min(1).max(64).optional()
});

const revalidateLicenseSchema = z.object({
  token: z.string().min(16),
  fingerprint: z.string().min(8).optional(),
  appVersion: z.string().min(1).max(64).optional()
});

const createLicenseSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["starter", "professional", "business", "reseller"]),
  seatLimit: z.number().int().min(1).max(100000).optional(),
  durationDays: z.number().int().min(1).max(3650).optional(),
  licenseKey: z.string().min(8).optional(),
  metadata: z.record(z.any()).optional()
});

const revokeLicenseSchema = z.object({
  licenseKey: z.string().min(8),
  reason: z.string().max(500).optional()
});

function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppError(400, "Invalid request body.", result.error.issues);
  }
  return result.data;
}

module.exports = {
  validateLicenseSchema,
  revalidateLicenseSchema,
  createLicenseSchema,
  revokeLicenseSchema,
  parseBody
};

