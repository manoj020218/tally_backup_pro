const fs = require("fs").promises;
const path = require("path");
const { getLocalBackupPath } = require("./local-manager");

function is900File(fileName) {
  return String(fileName || "").toLowerCase().endsWith(".900");
}

async function collect900Files(dirPath, output = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Unable to read Tally data path: ${error.message}`);
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collect900Files(fullPath, output);
      continue;
    }

    if (entry.isFile() && is900File(entry.name)) {
      output.push(fullPath);
    }
  }

  return output;
}

async function runFull900Backup(profile, options = {}) {
  const tallyDataPath = String(options.tallyDataPath || "").trim();
  if (!tallyDataPath) {
    return {
      success: false,
      error: "Tally data location is not configured in Settings.",
      files: [],
      totalBytes: 0
    };
  }

  const files = await collect900Files(tallyDataPath);
  if (files.length === 0) {
    return {
      success: false,
      error: "No .900 files found in configured Tally data location.",
      files: [],
      totalBytes: 0
    };
  }

  const backupDir = await getLocalBackupPath(profile.localPath, profile.companyName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const copiedFiles = [];
  let totalBytes = 0;

  for (const sourcePath of files) {
    const sourceName = path.basename(sourcePath);
    const targetName = `full_900_${timestamp}_${sourceName}`;
    const targetPath = path.join(backupDir, targetName);

    await fs.copyFile(sourcePath, targetPath);
    const stats = await fs.stat(targetPath);
    totalBytes += stats.size;

    copiedFiles.push({
      sourcePath,
      filePath: targetPath,
      sizeBytes: stats.size
    });
  }

  return {
    success: true,
    reason: options.reason || "manual",
    files: copiedFiles,
    totalBytes
  };
}

module.exports = {
  collect900Files,
  runFull900Backup
};
