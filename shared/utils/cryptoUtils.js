const crypto = require("crypto");

function randomToken(bytes = 32) {
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new Error("bytes must be a positive integer");
  }
  return crypto.randomBytes(bytes).toString("base64url");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function deriveKeyPBKDF2(secret, salt, iterations = 150000, keyLength = 32) {
  if (!secret) throw new Error("secret is required");
  if (!salt) throw new Error("salt is required");
  return crypto.pbkdf2Sync(
    String(secret),
    String(salt),
    iterations,
    keyLength,
    "sha256"
  );
}

function encryptTextAESGCM(plainText, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error("key must be a 32-byte Buffer");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText || ""), "utf8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

function decryptTextAESGCM(payload, key) {
  if (!payload || typeof payload !== "object") {
    throw new Error("payload must be an object");
  }
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new Error("key must be a 32-byte Buffer");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = {
  randomToken,
  sha256Hex,
  deriveKeyPBKDF2,
  encryptTextAESGCM,
  decryptTextAESGCM,
  safeCompare
};

