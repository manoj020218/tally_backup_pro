const fs = require('fs').promises;
const { createReadStream, createWriteStream } = require('fs');
const zlib = require('zlib');
const path = require('path');

async function compressToGzip(content, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const writeStream = createWriteStream(outputPath);
      const gzip = zlib.createGzip();

      gzip.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      gzip.pipe(writeStream);
      gzip.end(content);
    } catch (error) {
      reject(error);
    }
  });
}

async function decompressGzip(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const readStream = createReadStream(filePath);
      const gunzip = zlib.createGunzip();
      let data = '';

      gunzip.on('data', chunk => {
        data += chunk.toString();
      });

      gunzip.on('end', () => {
        resolve(data);
      });

      gunzip.on('error', reject);
      readStream.on('error', reject);

      readStream.pipe(gunzip);
    } catch (error) {
      reject(error);
    }
  });
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      bytes: stats.size,
      kb: Math.ceil(stats.size / 1024),
      mb: (stats.size / (1024 * 1024)).toFixed(2)
    };
  } catch (error) {
    throw new Error(\`Failed to get file size: \${error.message}\`);
  }
}

module.exports = {
  compressToGzip,
  decompressGzip,
  getFileSize
};
