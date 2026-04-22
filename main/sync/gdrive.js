const fs = require("fs");
const path = require("path");

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";

function buildAuthHeaders(accessToken, extraHeaders = {}) {
  if (!accessToken) throw new Error("Google Drive accessToken is required.");
  return {
    Authorization: `Bearer ${accessToken}`,
    ...extraHeaders
  };
}

async function parseApiResponse(response, fallbackError) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const apiMessage =
      (typeof data === "object" &&
        data &&
        data.error &&
        data.error.message) ||
      fallbackError ||
      `Google Drive request failed: ${response.status}`;
    throw new Error(apiMessage);
  }

  return data;
}

function escapeQueryValue(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function getDriveAbout(accessToken) {
  const response = await fetch(
    `${DRIVE_API_BASE}/about?fields=user(emailAddress,displayName),storageQuota(limit,usage)`,
    {
      headers: buildAuthHeaders(accessToken)
    }
  );

  return parseApiResponse(response, "Failed to read Drive account info.");
}

async function listFiles(
  accessToken,
  {
    query = "",
    pageSize = 100,
    fields = "files(id,name,mimeType,modifiedTime,size,parents,appProperties),nextPageToken",
    spaces = "drive"
  } = {}
) {
  const params = new URLSearchParams({
    pageSize: String(pageSize),
    fields,
    spaces,
    orderBy: "modifiedTime desc"
  });
  if (query) params.set("q", query);

  const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
    headers: buildAuthHeaders(accessToken)
  });
  return parseApiResponse(response, "Failed to list Drive files.");
}

async function findFolderByName(accessToken, folderName, parentFolderId = null) {
  const escapedName = escapeQueryValue(folderName);
  const parentClause = parentFolderId
    ? ` and '${escapeQueryValue(parentFolderId)}' in parents`
    : "";
  const query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name = '${escapedName}'${parentClause}`;

  const result = await listFiles(accessToken, { query, pageSize: 10 });
  return result.files && result.files.length > 0 ? result.files[0] : null;
}

async function createFolder(accessToken, folderName, parentFolderId = null) {
  const metadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder"
  };
  if (parentFolderId) metadata.parents = [parentFolderId];

  const response = await fetch(`${DRIVE_API_BASE}/files?fields=id,name,parents`, {
    method: "POST",
    headers: buildAuthHeaders(accessToken, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(metadata)
  });

  return parseApiResponse(response, "Failed to create Drive folder.");
}

async function ensureDriveFolder(accessToken, folderName, parentFolderId = null) {
  const existing = await findFolderByName(accessToken, folderName, parentFolderId);
  if (existing) return existing;
  return createFolder(accessToken, folderName, parentFolderId);
}

async function uploadFileMultipart(
  accessToken,
  localFilePath,
  {
    fileName = path.basename(localFilePath),
    mimeType = "application/octet-stream",
    parentFolderId = null,
    appProperties = {},
    description = ""
  } = {}
) {
  const fileData = fs.readFileSync(localFilePath);
  const boundary = `tbp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const metadata = {
    name: fileName,
    appProperties
  };
  if (description) metadata.description = description;
  if (parentFolderId) metadata.parents = [parentFolderId];

  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n`,
      "utf8"
    ),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`, "utf8"),
    fileData,
    Buffer.from(`\r\n--${boundary}--`, "utf8")
  ]);

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}?uploadType=multipart&fields=id,name,md5Checksum,size,parents,modifiedTime`,
    {
      method: "POST",
      headers: buildAuthHeaders(accessToken, {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(multipartBody.length)
      }),
      body: multipartBody
    }
  );

  return parseApiResponse(response, "Failed to upload file to Google Drive.");
}

async function initiateResumableUpload(
  accessToken,
  {
    fileName,
    mimeType = "application/octet-stream",
    parentFolderId = null,
    fileSize = null,
    appProperties = {},
    description = ""
  }
) {
  if (!fileName) throw new Error("fileName is required for resumable upload.");

  const metadata = {
    name: fileName,
    appProperties
  };
  if (description) metadata.description = description;
  if (parentFolderId) metadata.parents = [parentFolderId];

  const headers = buildAuthHeaders(accessToken, {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": mimeType
  });
  if (fileSize !== null && fileSize !== undefined) {
    headers["X-Upload-Content-Length"] = String(fileSize);
  }

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}?uploadType=resumable&fields=id,name,md5Checksum,size,parents,modifiedTime`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(metadata)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to start resumable upload: ${response.status} ${errorText}`
    );
  }

  const uploadUrl = response.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Google Drive did not return resumable upload URL.");
  }

  return uploadUrl;
}

async function uploadChunk(accessToken, uploadUrl, buffer, start, end, total) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: buildAuthHeaders(accessToken, {
      "Content-Length": String(buffer.length),
      "Content-Range": `bytes ${start}-${end}/${total}`
    }),
    body: buffer
  });

  // 308 = Resume Incomplete
  if (response.status === 308) {
    return {
      completed: false,
      range: response.headers.get("range") || ""
    };
  }

  const data = await parseApiResponse(
    response,
    "Failed during resumable file upload."
  );

  return {
    completed: true,
    file: data
  };
}

async function updateFileContentMultipart(
  accessToken,
  fileId,
  localFilePath,
  {
    fileName = path.basename(localFilePath),
    mimeType = "application/octet-stream",
    appProperties = {}
  } = {}
) {
  if (!fileId) throw new Error("fileId is required for update.");

  const fileData = fs.readFileSync(localFilePath);
  const boundary = `tbp_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const metadata = {
    name: fileName,
    appProperties
  };

  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}\r\n`,
      "utf8"
    ),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`, "utf8"),
    fileData,
    Buffer.from(`\r\n--${boundary}--`, "utf8")
  ]);

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/${encodeURIComponent(
      fileId
    )}?uploadType=multipart&fields=id,name,md5Checksum,size,parents,modifiedTime`,
    {
      method: "PATCH",
      headers: buildAuthHeaders(accessToken, {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(multipartBody.length)
      }),
      body: multipartBody
    }
  );

  return parseApiResponse(response, "Failed to update Drive file.");
}

async function downloadFileContent(accessToken, fileId) {
  if (!fileId) throw new Error("fileId is required for download.");

  const response = await fetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: buildAuthHeaders(accessToken)
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download file content: ${response.status} ${text}`);
  }

  return response.text();
}

module.exports = {
  DRIVE_API_BASE,
  DRIVE_UPLOAD_BASE,
  buildAuthHeaders,
  getDriveAbout,
  listFiles,
  findFolderByName,
  createFolder,
  ensureDriveFolder,
  uploadFileMultipart,
  initiateResumableUpload,
  uploadChunk,
  updateFileContentMultipart,
  downloadFileContent
};

