const fs = require("fs");
const path = require("path");
const {
  initiateResumableUpload,
  uploadChunk,
  uploadFileMultipart
} = require("./gdrive");

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
}

async function withRetry(fn, { retries = DEFAULT_MAX_RETRIES, backoffMs = DEFAULT_BACKOFF_BASE_MS } = {}) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryableError(error)) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 250);
      const waitMs = backoffMs * 2 ** attempt + jitter;
      await sleep(waitMs);
      attempt += 1;
    }
  }

  throw lastError || new Error("Upload failed after retries.");
}

async function uploadFileResumable(
  accessToken,
  localFilePath,
  {
    fileName = path.basename(localFilePath),
    mimeType = "application/octet-stream",
    parentFolderId = null,
    appProperties = {},
    description = "",
    chunkSize = DEFAULT_CHUNK_SIZE,
    maxRetries = DEFAULT_MAX_RETRIES,
    onProgress = null
  } = {}
) {
  const stats = fs.statSync(localFilePath);
  const fileSize = stats.size;

  if (fileSize <= chunkSize) {
    const direct = await withRetry(
      () =>
        uploadFileMultipart(accessToken, localFilePath, {
          fileName,
          mimeType,
          parentFolderId,
          appProperties,
          description
        }),
      { retries: maxRetries }
    );

    if (typeof onProgress === "function") {
      onProgress({
        uploadedBytes: fileSize,
        totalBytes: fileSize,
        percent: 100
      });
    }

    return direct;
  }

  const uploadUrl = await withRetry(
    () =>
      initiateResumableUpload(accessToken, {
        fileName,
        mimeType,
        parentFolderId,
        fileSize,
        appProperties,
        description
      }),
    { retries: maxRetries }
  );

  const fd = fs.openSync(localFilePath, "r");
  let uploadedBytes = 0;
  let finalFile = null;

  try {
    while (uploadedBytes < fileSize) {
      const endExclusive = Math.min(uploadedBytes + chunkSize, fileSize);
      const bytesToRead = endExclusive - uploadedBytes;
      const chunk = Buffer.allocUnsafe(bytesToRead);
      fs.readSync(fd, chunk, 0, bytesToRead, uploadedBytes);

      const chunkStart = uploadedBytes;
      const chunkEnd = endExclusive - 1;
      const result = await withRetry(
        () =>
          uploadChunk(
            accessToken,
            uploadUrl,
            chunk,
            chunkStart,
            chunkEnd,
            fileSize
          ),
        { retries: maxRetries }
      );

      uploadedBytes = endExclusive;

      if (typeof onProgress === "function") {
        const percent = Math.floor((uploadedBytes / fileSize) * 100);
        onProgress({
          uploadedBytes,
          totalBytes: fileSize,
          percent
        });
      }

      if (result.completed) {
        finalFile = result.file;
        break;
      }
    }
  } finally {
    fs.closeSync(fd);
  }

  if (!finalFile) {
    throw new Error("Resumable upload did not complete successfully.");
  }

  return finalFile;
}

module.exports = {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_RETRIES,
  uploadFileResumable,
  withRetry
};

