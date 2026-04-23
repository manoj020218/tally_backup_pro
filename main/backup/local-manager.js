const fs = require("fs").promises;
const path = require("path");

function sanitizePathSegment(value) {
  return String(value || "default")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function getLocalBackupPath(basePath, companyName, date = new Date()) {
  const safeCompany = sanitizePathSegment(companyName || "Company");
  const dateFolder = date.toISOString().slice(0, 10);
  const fullPath = path.join(basePath, safeCompany, dateFolder);
  await ensureDirectory(fullPath);
  return fullPath;
}

async function removeEmptyDirectories(rootPath) {
  let children = [];
  try {
    children = await fs.readdir(rootPath, { withFileTypes: true });
  } catch (_error) {
    return;
  }

  for (const child of children) {
    if (child.isDirectory()) {
      await removeEmptyDirectories(path.join(rootPath, child.name));
    }
  }

  const remaining = await fs.readdir(rootPath);
  if (remaining.length === 0) {
    try {
      await fs.rmdir(rootPath);
    } catch (_error) {
      // ignore cleanup errors
    }
  }
}

async function cleanupOldBackups(basePath, retentionDays) {
  try {
    const now = Date.now();
    const safeRetentionDays = Number.isFinite(retentionDays)
      ? retentionDays
      : Number.parseInt(retentionDays || "30", 10);
    const cutoffTime = now - Math.max(1, safeRetentionDays) * 24 * 60 * 60 * 1000;

    async function deleteOldFiles(dir) {
      const files = await fs.readdir(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const stats = await fs.stat(fullPath);

        if (file.isDirectory()) {
          await deleteOldFiles(fullPath);
          continue;
        }

        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(fullPath);
        }
      }
    }

    await deleteOldFiles(basePath);
    await removeEmptyDirectories(basePath);
  } catch (error) {
    // Do not fail backup execution on retention cleanup issues.
    console.warn(`Cleanup skipped: ${error.message}`);
  }
}

async function getAvailableDiskBytes(targetPath) {
  const resolved = path.resolve(String(targetPath || process.cwd()));
  await fs.mkdir(resolved, { recursive: true });

  if (typeof fs.statfs !== "function") {
    // Conservative fallback for older Node runtimes without statfs.
    return Number.MAX_SAFE_INTEGER;
  }

  const stats = await fs.statfs(resolved);
  const blockSize = Number(stats.bsize || 0);
  const availableBlocks = Number(stats.bavail || stats.bfree || 0);

  if (!Number.isFinite(blockSize) || !Number.isFinite(availableBlocks)) {
    return 0;
  }

  return Math.max(0, Math.floor(blockSize * availableBlocks));
}

async function ensureFreeDiskSpace(targetPath, requiredBytes) {
  const required = Math.max(0, Number(requiredBytes || 0));
  const freeBytes = await getAvailableDiskBytes(targetPath);

  return {
    freeBytes,
    requiredBytes: required,
    ok: freeBytes >= required
  };
}

module.exports = {
  sanitizePathSegment,
  ensureDirectory,
  getLocalBackupPath,
  cleanupOldBackups,
  getAvailableDiskBytes,
  ensureFreeDiskSpace
};
