const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {
  listFiles,
  uploadFileMultipart,
  updateFileContentMultipart,
  downloadFileContent
} = require("./gdrive");

const MANIFEST_FILE_NAME = "tallybackup_manifest.json";
const MANIFEST_MIME_TYPE = "application/json";

function sha256FileHex(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

function createManifestEntry({
  companyId = "",
  companyName = "",
  profileId = "",
  dataType = "",
  filePath = "",
  driveFileId = "",
  driveFileName = "",
  recordCount = 0,
  fromDate = "",
  toDate = "",
  metadata = {}
}) {
  const fileName = driveFileName || path.basename(filePath || "");
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    companyId,
    companyName,
    profileId,
    dataType,
    fileName,
    driveFileId,
    recordCount,
    fromDate,
    toDate,
    checksum: filePath ? sha256FileHex(filePath) : "",
    uploadedAt: new Date().toISOString(),
    machine: os.hostname(),
    metadata
  };
}

function createEmptyManifest() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    entries: []
  };
}

function normalizeManifest(manifest) {
  if (!manifest || typeof manifest !== "object") return createEmptyManifest();
  return {
    version: Number.isInteger(manifest.version) ? manifest.version : 1,
    updatedAt: manifest.updatedAt || new Date().toISOString(),
    entries: Array.isArray(manifest.entries) ? manifest.entries : []
  };
}

function mergeManifestEntry(manifest, entry) {
  const normalized = normalizeManifest(manifest);
  const index = normalized.entries.findIndex(
    (item) =>
      item.driveFileId &&
      entry.driveFileId &&
      String(item.driveFileId) === String(entry.driveFileId)
  );

  if (index >= 0) {
    normalized.entries[index] = {
      ...normalized.entries[index],
      ...entry
    };
  } else {
    normalized.entries.push(entry);
  }

  normalized.updatedAt = new Date().toISOString();
  return normalized;
}

async function findRemoteManifestFile(accessToken, folderId) {
  const escapedName = MANIFEST_FILE_NAME.replace(/'/g, "\\'");
  const parentClause = folderId ? ` and '${folderId}' in parents` : "";
  const query = `name = '${escapedName}' and trashed = false${parentClause}`;
  const files = await listFiles(accessToken, {
    query,
    pageSize: 5,
    fields: "files(id,name,modifiedTime,size)"
  });
  return files.files && files.files.length > 0 ? files.files[0] : null;
}

async function readRemoteManifest(accessToken, folderId) {
  const remoteFile = await findRemoteManifestFile(accessToken, folderId);
  if (!remoteFile) {
    return {
      file: null,
      manifest: createEmptyManifest()
    };
  }

  const content = await downloadFileContent(accessToken, remoteFile.id);
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (_error) {
    parsed = createEmptyManifest();
  }

  return {
    file: remoteFile,
    manifest: normalizeManifest(parsed)
  };
}

function writeTempManifestFile(manifest) {
  const tempPath = path.join(
    os.tmpdir(),
    `tbp_manifest_${Date.now()}_${Math.random().toString(16).slice(2)}.json`
  );
  fs.writeFileSync(tempPath, JSON.stringify(manifest, null, 2), "utf8");
  return tempPath;
}

async function saveRemoteManifest(accessToken, folderId, manifest, existingFileId = "") {
  const normalized = normalizeManifest(manifest);
  normalized.updatedAt = new Date().toISOString();

  const tempFile = writeTempManifestFile(normalized);
  try {
    if (existingFileId) {
      return await updateFileContentMultipart(accessToken, existingFileId, tempFile, {
        fileName: MANIFEST_FILE_NAME,
        mimeType: MANIFEST_MIME_TYPE
      });
    }

    return await uploadFileMultipart(accessToken, tempFile, {
      fileName: MANIFEST_FILE_NAME,
      mimeType: MANIFEST_MIME_TYPE,
      parentFolderId: folderId
    });
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch (_error) {
      // ignore temp cleanup error
    }
  }
}

async function addBackupToManifest(accessToken, folderId, entryData) {
  const entry = createManifestEntry(entryData);
  const { file, manifest } = await readRemoteManifest(accessToken, folderId);
  const merged = mergeManifestEntry(manifest, entry);

  const saved = await saveRemoteManifest(
    accessToken,
    folderId,
    merged,
    file ? file.id : ""
  );

  return {
    entry,
    manifest: merged,
    remoteFile: saved
  };
}

module.exports = {
  MANIFEST_FILE_NAME,
  createManifestEntry,
  createEmptyManifest,
  normalizeManifest,
  mergeManifestEntry,
  findRemoteManifestFile,
  readRemoteManifest,
  saveRemoteManifest,
  addBackupToManifest
};

