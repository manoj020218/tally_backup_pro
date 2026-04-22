# TallyBackup Pro VPS API

This folder contains the **VPS-side backend** for license validation, aligned with the project spec:
- Node.js + Express REST API
- PostgreSQL license store
- JWT-based activation and revalidation
- Admin endpoints for license create/revoke

## 1) What This Service Does

1. Desktop app sends `licenseKey`, `fingerprint`, `appVersion`.
2. API verifies key exists, not revoked, not expired, and seat limit is not exceeded.
3. API activates fingerprint if eligible and returns a signed JWT.
4. Desktop app can revalidate token daily via API.

## 2) API Endpoints

### Public
- `GET /health`
- `POST /api/v1/licenses/validate`
- `POST /api/v1/licenses/revalidate`

### Admin (requires `x-admin-key`)
- `POST /api/v1/admin/licenses`
- `POST /api/v1/admin/licenses/revoke`
- `GET /api/v1/admin/licenses/:licenseKey`
- `GET /api/v1/admin/licenses?limit=50`

## 3) Local Run (Without Docker)

1. Copy `.env.example` to `.env` and set real secrets.
2. Start PostgreSQL locally.
3. Run:

```bash
cd VPS
npm install
npm run check
npm test
npm start
```

## 4) Local Run (Docker Compose)

```bash
cd VPS
docker compose up --build
```

API becomes available at `http://localhost:8080`.

## 5) Quick Smoke Test

Create a license:

```bash
curl -X POST http://localhost:8080/api/v1/admin/licenses ^
  -H "Content-Type: application/json" ^
  -H "x-admin-key: change-this-admin-key" ^
  -d "{\"email\":\"client@example.com\",\"tier\":\"starter\",\"durationDays\":365}"
```

Validate license:

```bash
curl -X POST http://localhost:8080/api/v1/licenses/validate ^
  -H "Content-Type: application/json" ^
  -d "{\"licenseKey\":\"TBP-XXXX-XXXX-XXXX-XXXX\",\"fingerprint\":\"MACHINE-ABC123\",\"appVersion\":\"1.0.0\"}"
```

Revalidate token:

```bash
curl -X POST http://localhost:8080/api/v1/licenses/revalidate ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"<jwt>\",\"fingerprint\":\"MACHINE-ABC123\",\"appVersion\":\"1.0.1\"}"
```

## 6) Deployment Notes

1. Set strong values for `JWT_SECRET` and `ADMIN_API_KEY`.
2. Use HTTPS on VPS (Nginx/Caddy reverse proxy + TLS).
3. Keep PostgreSQL private (no public DB port exposure).
4. Backup PostgreSQL regularly.
5. Restrict admin endpoint access by IP and API key.

