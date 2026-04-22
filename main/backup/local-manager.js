const fs = require('fs').promises;
const path = require('path');

async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function getLocalBackupPath(basePath, companyName) {
  const dateFolder = new Date().toISOString().slice(0, 10);
  const fullPath = path.join(basePath, companyName, dateFolder);
  await ensureDirectory(fullPath);
  return fullPath;
}

async function cleanupOldBackups(basePath, retentionDays) {
  try {
    const now = Date.now();
    const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);

    async function deleteOldFiles(dir) {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        const stats = await fs.stat(fullPath);

        if (stats.mtimeMs < cutoffTime) {
          if (file.isDirectory()) {
            await deleteOldFiles(fullPath);
            try {
              await fs.rmdir(fullPath);
            } catch (error) {
              console.warn(\`Failed to remove directory: \${fullPath}\`);
            }
          } else {
            await fs.unlink(fullPath);
          }
        }
      }
    }

    await deleteOldFiles(basePath);
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

module.exports = {
  ensureDirectory,
  getLocalBackupPath,
  cleanupOldBackups
};
