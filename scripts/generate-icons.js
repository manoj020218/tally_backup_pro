#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const DEFAULT_SIZES = [16, 24, 32, 48, 64, 128, 256, 512];
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

function getArgValue(flag) {
  const index = process.argv.findIndex((arg) => arg === flag);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function hasArg(flag) {
  return process.argv.includes(flag);
}

function parseSizes(input) {
  if (!input) return [...DEFAULT_SIZES];
  return input
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((size) => Number.isInteger(size) && size > 0);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function requirePackage(name) {
  try {
    return require(name);
  } catch (_error) {
    return null;
  }
}

async function generatePngIcons({
  sourcePath,
  outputDir,
  sizes = DEFAULT_SIZES
}) {
  const sharp = requirePackage("sharp");
  if (!sharp) {
    throw new Error(
      "Missing dependency 'sharp'. Install it with: npm install --save-dev sharp"
    );
  }

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source image not found: ${sourcePath}`);
  }

  ensureDir(outputDir);

  const generated = [];
  for (const size of sizes) {
    const outPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(sourcePath)
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(outPath);
    generated.push({ size, path: outPath });
  }

  return generated;
}

async function generateIcoFromPngs({
  outputDir,
  pngIcons,
  icoName = "icon.ico",
  installIcoName = "install-icon.ico"
}) {
  const toIco = requirePackage("to-ico");
  if (!toIco) {
    console.log(
      "Skipping .ico generation because 'to-ico' is not installed. Install: npm install --save-dev to-ico"
    );
    return null;
  }

  const filtered = pngIcons
    .filter((icon) => ICO_SIZES.includes(icon.size))
    .sort((a, b) => a.size - b.size);

  if (filtered.length === 0) {
    throw new Error("No PNG icons available for .ico conversion.");
  }

  const buffers = filtered.map((icon) => fs.readFileSync(icon.path));
  const icoBuffer = await toIco(buffers);

  const icoPath = path.join(outputDir, icoName);
  const installIcoPath = path.join(outputDir, installIcoName);

  fs.writeFileSync(icoPath, icoBuffer);
  fs.writeFileSync(installIcoPath, icoBuffer);

  return {
    icoPath,
    installIcoPath
  };
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/generate-icons.js [--source <png>] [--out <assets-dir>] [--sizes 16,32,64,128,256,512]",
      "",
      "Defaults:",
      "  --source assets/icon-source.png",
      "  --out assets",
      "",
      "Dependencies:",
      "  sharp (required), to-ico (optional for icon.ico/install-icon.ico)"
    ].join("\n")
  );
}

async function runFromCli() {
  if (hasArg("--help") || hasArg("-h")) {
    printUsage();
    return;
  }

  const rootDir = process.cwd();
  const sourcePath = path.resolve(
    rootDir,
    getArgValue("--source") || path.join("assets", "icon-source.png")
  );
  const outputDir = path.resolve(
    rootDir,
    getArgValue("--out") || "assets"
  );
  const sizes = parseSizes(getArgValue("--sizes"));

  try {
    const pngIcons = await generatePngIcons({
      sourcePath,
      outputDir,
      sizes
    });

    const icoResult = await generateIcoFromPngs({
      outputDir,
      pngIcons
    });

    console.log(`Generated ${pngIcons.length} PNG icon(s) in ${outputDir}`);
    if (icoResult) {
      console.log(`Generated ICO files: ${icoResult.icoPath}, ${icoResult.installIcoPath}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runFromCli();
}

module.exports = {
  DEFAULT_SIZES,
  ICO_SIZES,
  parseSizes,
  generatePngIcons,
  generateIcoFromPngs
};

