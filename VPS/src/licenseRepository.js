function mapLicenseRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    licenseKey: row.license_key,
    email: row.email,
    tier: row.tier,
    seatLimit: row.seat_limit,
    seatsUsed: row.seats_used,
    activatedFingerprints: row.activated_fingerprints || [],
    expiresAt: row.expires_at,
    isRevoked: row.is_revoked,
    revokedReason: row.revoked_reason,
    revokedAt: row.revoked_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getByLicenseKey(client, licenseKey, lockForUpdate = false) {
  const suffix = lockForUpdate ? " FOR UPDATE" : "";
  const query = `SELECT * FROM licenses WHERE license_key = $1${suffix}`;
  const result = await client.query(query, [licenseKey]);
  return mapLicenseRow(result.rows[0] || null);
}

async function createLicense(client, payload) {
  const result = await client.query(
    `INSERT INTO licenses
      (license_key, email, tier, seat_limit, seats_used, activated_fingerprints, expires_at, metadata)
     VALUES ($1, $2, $3, $4, 0, ARRAY[]::TEXT[], $5, $6::JSONB)
     RETURNING *`,
    [
      payload.licenseKey,
      payload.email,
      payload.tier,
      payload.seatLimit,
      payload.expiresAt,
      JSON.stringify(payload.metadata || {})
    ]
  );
  return mapLicenseRow(result.rows[0]);
}

async function updateActivations(client, licenseKey, activatedFingerprints) {
  const seatsUsed = activatedFingerprints.length;
  const result = await client.query(
    `UPDATE licenses
     SET activated_fingerprints = $2, seats_used = $3
     WHERE license_key = $1
     RETURNING *`,
    [licenseKey, activatedFingerprints, seatsUsed]
  );
  return mapLicenseRow(result.rows[0] || null);
}

async function revokeLicense(client, licenseKey, reason) {
  const result = await client.query(
    `UPDATE licenses
     SET is_revoked = TRUE, revoked_reason = $2, revoked_at = NOW()
     WHERE license_key = $1
     RETURNING *`,
    [licenseKey, reason || "Revoked by admin"]
  );
  return mapLicenseRow(result.rows[0] || null);
}

async function listLicenses(client, limit = 50) {
  const result = await client.query(
    `SELECT * FROM licenses ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapLicenseRow);
}

module.exports = {
  getByLicenseKey,
  createLicense,
  updateActivations,
  revokeLicense,
  listLicenses
};

