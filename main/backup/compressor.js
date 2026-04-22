const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");
const { promisify } = require("util");

const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);

async function compressToGzip(content, outputPath) {
  const payload =
    Buffer.isBuffer(content) ? content : Buffer.from(String(content || ""), "utf8");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const compressed = await gzipAsync(payload);
  await fs.writeFile(outputPath, compressed);
  return outputPath;
}

async function decompressGzip(filePath) {
  const compressed = await fs.readFile(filePath);
  const data = await gunzipAsync(compressed);
  return data.toString("utf8");
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      bytes: stats.size,
      kb: Math.ceil(stats.size / 1024),
      mb: Number((stats.size / (1024 * 1024)).toFixed(2))
    };
  } catch (error) {
    throw new Error(`Failed to get file size: ${error.message}`);
  }
}

module.exports = {
  compressToGzip,
  decompressGzip,
  getFileSize
};
