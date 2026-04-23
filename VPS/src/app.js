const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config");
const { AppError, isAppError, asyncHandler } = require("./errors");
const { checkDbHealth } = require("./db");
const {
  parseBody,
  validateLicenseSchema,
  revalidateLicenseSchema,
  createLicenseSchema,
  revokeLicenseSchema
} = require("./validators");
const { validateLicense, revalidateLicense } = require("./licenseService");
const {
  createLicense,
  revokeLicense,
  getLicenseByKey,
  listLicenses
} = require("./adminService");

const app = express();
const publicDir = path.resolve(__dirname, "..", "site");

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use("/static", express.static(publicDir));

function sendPublicPage(fileName) {
  return (_req, res) => {
    res.sendFile(path.join(publicDir, fileName));
  };
}

app.get("/", sendPublicPage("index.html"));
app.get("/about", sendPublicPage("about.html"));
app.get("/privacy", sendPublicPage("privacy.html"));
app.get("/terms", sendPublicPage("terms.html"));
app.get("/terms-and-conditions", sendPublicPage("terms.html"));
app.get("/sitemap.xml", sendPublicPage("sitemap.xml"));
app.get("/robots.txt", sendPublicPage("robots.txt"));
app.get("/favicon.ico", (_req, res) => {
  res.sendFile(path.join(publicDir, "favicon.png"));
});

function requireAdmin(req, _res, next) {
  const apiKey = req.get("x-admin-key");
  if (!apiKey || apiKey !== config.adminApiKey) {
    next(new AppError(401, "Unauthorized admin request."));
    return;
  }
  next();
}

app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await checkDbHealth();
    res.json({
      ok: true,
      service: "tallybackup-pro-license-api",
      timestamp: new Date().toISOString()
    });
  })
);

app.post(
  "/api/v1/licenses/validate",
  asyncHandler(async (req, res) => {
    const payload = parseBody(validateLicenseSchema, req.body);
    const result = await validateLicense(payload);
    res.json(result);
  })
);

app.post(
  "/api/v1/licenses/revalidate",
  asyncHandler(async (req, res) => {
    const payload = parseBody(revalidateLicenseSchema, req.body);
    const result = await revalidateLicense(payload);
    res.json(result);
  })
);

app.post(
  "/api/v1/admin/licenses",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = parseBody(createLicenseSchema, req.body);
    const result = await createLicense(payload);
    res.status(201).json(result);
  })
);

app.post(
  "/api/v1/admin/licenses/revoke",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = parseBody(revokeLicenseSchema, req.body);
    const result = await revokeLicense(payload);
    res.json(result);
  })
);

app.get(
  "/api/v1/admin/licenses/:licenseKey",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await getLicenseByKey(req.params.licenseKey);
    res.json(result);
  })
);

app.get(
  "/api/v1/admin/licenses",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await listLicenses(req.query.limit);
    res.json(result);
  })
);

app.use((_req, _res, next) => {
  next(new AppError(404, "Route not found."));
});

app.use((error, _req, res, next) => {
  void next;
  if (isAppError(error)) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details || null
    });
    return;
  }

  console.error("Unhandled server error:", error);
  res.status(500).json({
    error: "Internal server error"
  });
});

module.exports = app;
