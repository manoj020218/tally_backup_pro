#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_TIMESTAMP_URL = "http://timestamp.digicert.com";

function getArgValue(flag) {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function hasArg(flag) {
  return process.argv.includes(flag);
}

function normalizePath(filePath) {
  return path.resolve(String(filePath || ""));
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function resolveSignToolPath() {
  const whereResult = spawnSync("where", ["signtool"], { encoding: "utf8" });
  if (whereResult.status === 0) {
    const output = String(whereResult.stdout || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (output.length > 0 && fileExists(output[0])) {
      return output[0];
    }
  }

  const kitRoots = [
    process.env["ProgramFiles(x86)"],
    process.env["ProgramFiles"]
  ].filter(Boolean);

  for (const root of kitRoots) {
    const candidate = path.join(
      root,
      "Windows Kits",
      "10",
      "bin"
    );
    if (!fileExists(candidate)) continue;

    const versions = fs
      .readdirSync(candidate, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();

    for (const version of versions) {
      const x64 = path.join(candidate, version, "x64", "signtool.exe");
      if (fileExists(x64)) {
        return x64;
      }
    }
  }

  return "";
}

function resolveCertificatePath(explicitPath = "") {
  if (explicitPath && fileExists(explicitPath)) {
    return normalizePath(explicitPath);
  }

  const envCandidates = [
    process.env.CERT_PATH,
    process.env.WINDOWS_CERT_PATH,
    process.env.CSC_LINK
  ].filter(Boolean);

  for (const candidate of envCandidates) {
    // Skip URL/base64 style CSC_LINK values and accept only local file path.
    if (/^https?:\/\//i.test(candidate)) continue;
    const normalized = normalizePath(candidate);
    if (fileExists(normalized)) {
      return normalized;
    }
  }

  return "";
}

function buildSignArguments({
  filePath,
  certPath,
  certPassword = "",
  timestampUrl = DEFAULT_TIMESTAMP_URL,
  digestAlgorithm = "sha256",
  append = false
}) {
  const args = ["sign"];
  if (append) args.push("/as");

  args.push("/fd", digestAlgorithm);
  args.push("/td", digestAlgorithm);
  args.push("/tr", timestampUrl);
  args.push("/f", certPath);

  if (certPassword) {
    args.push("/p", certPassword);
  }

  args.push(filePath);
  return args;
}

function signFile({
  filePath,
  certPath,
  certPassword = "",
  timestampUrl = DEFAULT_TIMESTAMP_URL,
  digestAlgorithm = "sha256",
  append = false
}) {
  const absoluteFile = normalizePath(filePath);
  if (!fileExists(absoluteFile)) {
    throw new Error(`File not found: ${absoluteFile}`);
  }

  const certificate = resolveCertificatePath(certPath);
  if (!certificate) {
    throw new Error(
      "Certificate file not found. Set CERT_PATH or pass --cert <path-to-pfx>."
    );
  }

  const signTool = resolveSignToolPath();
  if (!signTool) {
    throw new Error(
      "signtool.exe not found. Install Windows SDK Signing Tools first."
    );
  }

  const args = buildSignArguments({
    filePath: absoluteFile,
    certPath: certificate,
    certPassword,
    timestampUrl,
    digestAlgorithm,
    append
  });

  const result = spawnSync(signTool, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Signing failed for ${absoluteFile}`);
  }

  return {
    filePath: absoluteFile,
    certPath: certificate,
    signTool
  };
}

function signArtifacts(artifactPaths, options) {
  const files = (artifactPaths || [])
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => /\.(exe|msi)$/i.test(filePath));

  const signed = [];
  for (const filePath of files) {
    signed.push(signFile({ ...options, filePath }));
  }
  return signed;
}

async function afterSign(context) {
  if (String(process.env.SKIP_SIGN || "").toLowerCase() === "true") {
    console.log("Skipping signing because SKIP_SIGN=true.");
    return;
  }

  const certPath = resolveCertificatePath();
  if (!certPath) {
    console.log("Skipping signing because certificate path is not configured.");
    return;
  }

  const artifactPaths = context && Array.isArray(context.artifactPaths)
    ? context.artifactPaths
    : [];

  if (artifactPaths.length === 0) {
    console.log("No artifacts found for signing.");
    return;
  }

  const certPassword = process.env.CERT_PASS || process.env.CSC_KEY_PASSWORD || "";
  const timestampUrl = process.env.TIMESTAMP_URL || DEFAULT_TIMESTAMP_URL;
  signArtifacts(artifactPaths, {
    certPath,
    certPassword,
    timestampUrl
  });
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/sign.js --file <path-to-exe-or-msi> [--cert <path-to-pfx>] [--password <pfx-password>] [--timestamp <url>]",
      "",
      "Environment fallback:",
      "  CERT_PATH, CERT_PASS, TIMESTAMP_URL"
    ].join("\n")
  );
}

function runFromCli() {
  if (hasArg("--help") || hasArg("-h")) {
    printUsage();
    return;
  }

  const filePath = getArgValue("--file");
  if (!filePath) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const certPath = getArgValue("--cert");
  const certPassword = getArgValue("--password") || process.env.CERT_PASS || "";
  const timestampUrl = getArgValue("--timestamp") || process.env.TIMESTAMP_URL || DEFAULT_TIMESTAMP_URL;

  try {
    const signed = signFile({
      filePath,
      certPath,
      certPassword,
      timestampUrl
    });
    console.log(`Signed successfully: ${signed.filePath}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runFromCli();
}

module.exports = {
  DEFAULT_TIMESTAMP_URL,
  resolveSignToolPath,
  resolveCertificatePath,
  signFile,
  signArtifacts,
  afterSign
};

