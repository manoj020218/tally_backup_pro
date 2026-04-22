CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  license_key TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'professional', 'business', 'reseller')),
  seat_limit INTEGER NOT NULL CHECK (seat_limit > 0),
  seats_used INTEGER NOT NULL DEFAULT 0 CHECK (seats_used >= 0),
  activated_fingerprints TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_reason TEXT,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_license_key ON licenses (license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses (email);
CREATE INDEX IF NOT EXISTS idx_licenses_active ON licenses (is_revoked, expires_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_licenses_updated_at ON licenses;
CREATE TRIGGER trg_licenses_updated_at
BEFORE UPDATE ON licenses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

