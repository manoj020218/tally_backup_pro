const http = require("http");
const crypto = require("crypto");
const os = require("os");
const { URL, URLSearchParams } = require("url");
const { shell } = require("electron");
const { machineIdSync } = require("node-machine-id");
const { getSetting, setSetting } = require("../db/queries");

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const DEFAULT_TIMEOUT_MS = 180000;
const TOKEN_STORE_KEY = "gdrive_auth_payload";
const TOKEN_EMAIL_KEY = "gdrive_auth_email";
const TOKEN_UPDATED_AT_KEY = "gdrive_auth_updated_at";
const TOKEN_ENCRYPTION_SALT_KEY = "gdrive_auth_salt";

function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(bytes = 32) {
  return toBase64Url(crypto.randomBytes(bytes));
}

function createPKCEPair() {
  const codeVerifier = randomString(48);
  const codeChallenge = toBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256"
  };
}

function buildGoogleAuthUrl({
  clientId,
  redirectUri,
  scopes = DEFAULT_SCOPES,
  state,
  codeChallenge,
  accessType = "offline",
  prompt = "consent"
}) {
  if (!clientId) throw new Error("Google OAuth clientId is required.");
  if (!redirectUri) throw new Error("Google OAuth redirectUri is required.");
  if (!codeChallenge) throw new Error("PKCE codeChallenge is required.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    state: state || randomString(16),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: accessType,
    prompt
  });

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

function startOAuthCallbackServer({
  hostname = "127.0.0.1",
  port = 3478,
  callbackPath = "/oauth2callback",
  expectedState,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  return new Promise((resolve, reject) => {
    let settled = false;

    function cleanup(server, timeout) {
      clearTimeout(timeout);
      try {
        server.close();
      } catch (_error) {
        // no-op
      }
    }

    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url, `http://${hostname}:${port}`);
        if (requestUrl.pathname !== callbackPath) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const state = requestUrl.searchParams.get("state");
        const oauthError = requestUrl.searchParams.get("error");

        if (oauthError) {
          throw new Error(`OAuth authorization failed: ${oauthError}`);
        }

        if (!code) {
          throw new Error("OAuth callback did not include authorization code.");
        }

        if (expectedState && state !== expectedState) {
          throw new Error("OAuth state mismatch detected.");
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Authorization complete.</h2><p>You can close this tab and return to TallyBackup Pro.</p></body></html>"
        );

        if (!settled) {
          settled = true;
          cleanup(server, timeout);
          resolve({ code, state });
        }
      } catch (error) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(error.message);
        if (!settled) {
          settled = true;
          cleanup(server, timeout);
          reject(error);
        }
      }
    });

    server.on("error", (error) => {
      if (!settled) {
        settled = true;
        cleanup(server, timeout);
        reject(error);
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup(server, timeout);
        reject(new Error("OAuth authorization timed out."));
      }
    }, timeoutMs);

    server.listen(port, hostname);
  });
}

async function tokenRequest(payload) {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    const errorDescription =
      data.error_description || data.error || "Unknown OAuth token error";
    throw new Error(`Google token exchange failed: ${errorDescription}`);
  }

  return data;
}

async function exchangeCodeForTokens({
  clientId,
  clientSecret,
  redirectUri,
  code,
  codeVerifier
}) {
  if (!code) throw new Error("Authorization code is required.");
  if (!codeVerifier) throw new Error("PKCE codeVerifier is required.");

  const payload = {
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier
  };

  if (clientSecret) payload.client_secret = clientSecret;
  return tokenRequest(payload);
}

async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  if (!refreshToken) throw new Error("refreshToken is required.");

  const payload = {
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  };

  if (clientSecret) payload.client_secret = clientSecret;
  return tokenRequest(payload);
}

function getOrCreateEncryptionSalt() {
  const existing = safeGetSetting(TOKEN_ENCRYPTION_SALT_KEY);
  if (existing) return existing;

  const salt = randomString(16);
  safeSetSetting(TOKEN_ENCRYPTION_SALT_KEY, salt);
  return salt;
}

function deriveTokenEncryptionKey() {
  const salt = getOrCreateEncryptionSalt();
  const machineFingerprint = machineIdSync({ original: true }) || os.hostname();
  return crypto.pbkdf2Sync(machineFingerprint, salt, 150000, 32, "sha256");
}

function encryptJsonPayload(value) {
  const key = deriveTokenEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  });
}

function decryptJsonPayload(encryptedPayload) {
  const parsed = JSON.parse(encryptedPayload);
  const key = deriveTokenEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(parsed.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, "base64")),
    decipher.final()
  ]);

  return JSON.parse(plaintext.toString("utf8"));
}

function safeGetSetting(key) {
  try {
    return getSetting(key);
  } catch (_error) {
    return null;
  }
}

function safeSetSetting(key, value) {
  try {
    setSetting(key, value);
  } catch (_error) {
    // no-op in environments where DB is not initialized yet
  }
}

function saveAuthTokens(tokens, email = "") {
  if (!tokens || !tokens.refresh_token) {
    throw new Error("OAuth token payload is missing refresh_token.");
  }

  const payload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type || "Bearer",
    scope: tokens.scope || "",
    expiry_date:
      Date.now() + Number.parseInt(tokens.expires_in || "3600", 10) * 1000
  };

  const encrypted = encryptJsonPayload(payload);
  safeSetSetting(TOKEN_STORE_KEY, encrypted);
  safeSetSetting(TOKEN_EMAIL_KEY, email || "");
  safeSetSetting(TOKEN_UPDATED_AT_KEY, new Date().toISOString());

  return payload;
}

function loadAuthTokens() {
  const encrypted = safeGetSetting(TOKEN_STORE_KEY);
  if (!encrypted) return null;

  const payload = decryptJsonPayload(encrypted);
  return {
    ...payload,
    email: safeGetSetting(TOKEN_EMAIL_KEY) || ""
  };
}

function clearAuthTokens() {
  safeSetSetting(TOKEN_STORE_KEY, "");
  safeSetSetting(TOKEN_EMAIL_KEY, "");
  safeSetSetting(TOKEN_UPDATED_AT_KEY, "");
}

async function fetchGoogleAccountEmail(accessToken) {
  if (!accessToken) return "";

  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) return "";
  const profile = await response.json();
  return profile.email || "";
}

async function authorizeWithPkce({
  clientId,
  clientSecret,
  redirectUri = "http://127.0.0.1:3478/oauth2callback",
  scopes = DEFAULT_SCOPES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  openBrowser = true
}) {
  const redirect = new URL(redirectUri);
  const hostname = redirect.hostname;
  const port = Number.parseInt(redirect.port || "80", 10);
  const callbackPath = redirect.pathname || "/oauth2callback";

  const pkce = createPKCEPair();
  const state = randomString(16);
  const authUrl = buildGoogleAuthUrl({
    clientId,
    redirectUri,
    scopes,
    state,
    codeChallenge: pkce.codeChallenge
  });

  const codePromise = startOAuthCallbackServer({
    hostname,
    port,
    callbackPath,
    expectedState: state,
    timeoutMs
  });

  if (openBrowser) {
    await shell.openExternal(authUrl);
  }

  const { code } = await codePromise;
  const tokens = await exchangeCodeForTokens({
    clientId,
    clientSecret,
    redirectUri,
    code,
    codeVerifier: pkce.codeVerifier
  });

  const email = await fetchGoogleAccountEmail(tokens.access_token);
  const stored = saveAuthTokens(tokens, email);

  return {
    authUrl,
    email,
    tokens: stored
  };
}

async function ensureValidAccessToken({
  clientId,
  clientSecret
}) {
  const current = loadAuthTokens();
  if (!current) {
    throw new Error("Google Drive is not authenticated.");
  }

  if (current.expiry_date && current.expiry_date > Date.now() + 30000) {
    return current.access_token;
  }

  const refreshed = await refreshAccessToken({
    clientId,
    clientSecret,
    refreshToken: current.refresh_token
  });

  const merged = {
    ...current,
    access_token: refreshed.access_token,
    expiry_date:
      Date.now() + Number.parseInt(refreshed.expires_in || "3600", 10) * 1000
  };

  const encrypted = encryptJsonPayload(merged);
  safeSetSetting(TOKEN_STORE_KEY, encrypted);
  safeSetSetting(TOKEN_UPDATED_AT_KEY, new Date().toISOString());

  return merged.access_token;
}

module.exports = {
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_TOKEN_URL,
  DEFAULT_SCOPES,
  createPKCEPair,
  buildGoogleAuthUrl,
  startOAuthCallbackServer,
  exchangeCodeForTokens,
  refreshAccessToken,
  authorizeWithPkce,
  saveAuthTokens,
  loadAuthTokens,
  clearAuthTokens,
  ensureValidAccessToken,
  fetchGoogleAccountEmail
};

