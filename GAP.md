# TallyBackup Pro - GAP Tracker

Last Updated: 2026-04-23
Scope: ProjectSpec v1.0, Phase 1 + Phase 2

## Status Legend
- `DONE`: Implemented in codebase and wired in app flow.
- `PARTIAL`: Implemented but needs infra/config or deeper hardening.
- `PENDING`: Not implemented yet.

## Phase 1 - Core MVP (Weeks 1-6)

| Week | Deliverable | Status | Notes |
|---|---|---|---|
| 1 | Electron + React + Vite scaffold, SQLite schema, tray, autostart | DONE | App boots via Electron, SQLite schema initialized, tray exists, start-on-boot toggle persisted in Settings. |
| 2 | Tally connector (ping, XML builder/parser, status indicator) | DONE | `tally/connector`, `xml-builder`, `xml-parser` and dashboard status are active. |
| 3 | Backup engine (XML export, gzip, local save, manifest) | PARTIAL | XML export + gzip + local file save are done. Drive manifest sync is implemented for cloud uploads; local manifest file pipeline is not separately maintained. |
| 4 | Incremental logic + backup_state, date range selector + FY presets | DONE | Incremental state, first-run-full behavior, custom range, this/last FY modes implemented in engine + UI. |
| 5 | Google OAuth PKCE, Drive upload module, token encryption | DONE | Real OAuth PKCE flow, encrypted token storage, Drive status/connect/disconnect, resumable upload, manifest update wired. Requires valid Google OAuth credentials in Settings/.env. |
| 6 | Scheduler, notifications, dashboard + history UI | DONE | Cron scheduler active, reconnect queue retry, non-parallel execution queue, toast notifications, dashboard/history screens active. |

## Phase 2 - Production Features (Weeks 7-10)

| Week | Deliverable | Status | Notes |
|---|---|---|---|
| 7 | Size estimator UI + backend query, profile editor with all controls | DONE | Estimator wired with loading UX, profile controls expanded: date modes, custom dates, data types, retention, Drive sync toggle, company refresh. |
| 8 | OTA updater + installer config (NSIS, signing) | PARTIAL | `electron-updater` integrated with update channel support; production signing and release infrastructure still required. |
| 9 | License system (fingerprint, validate/revalidate, JWT flow) | PARTIAL | Local app-side flow implemented (fingerprint + startup/online/offline-grace behavior). Depends on external license API for full production validation lifecycle. |
| 10 | Restore/Export screen, CSV export, email alerts, multi-company support | PARTIAL | Restore + open folder + CSV export implemented. Multi-company via per-profile company mapping is implemented. Email alerts are still pending. |

## Website & Discoverability

| Item | Status | Notes |
|---|---|---|
| Public marketing website on VPS (`/`, `/about`, `/privacy`, `/terms`) | DONE | Implemented in VPS Express app with static site pages under `VPS/site`. |
| SEO metadata (title, description, canonical, robots, keywords) | DONE | Added to all public pages. |
| OpenGraph + Twitter card metadata (for WhatsApp/social previews) | DONE | Added on all public pages with shared OG image URL. |
| Sitemap + Robots | DONE | Added `sitemap.xml` and `robots.txt` routes and static files. |

## Critical Scenarios from Spec

| Scenario | Status | Notes |
|---|---|---|
| Tally closed -> queue XML, run .900 fallback, retry on reconnect | DONE | Implemented (`xml-queue`, `.900` fallback, reconnect monitor). |
| Incremental with no new records -> skip file, update state | DONE | Implemented in backup engine. |
| Disk space insufficient -> abort gracefully | DONE | Implemented preflight disk check. |
| Multiple scheduled profiles should not run in parallel | DONE | Scheduler now serializes backup execution. |
| Google token expiry during upload -> refresh and continue | DONE | OAuth refresh path wired via `ensureValidAccessToken`. |
| Backup interrupted mid-way -> resumable/recoverable workflow | PARTIAL | Drive resumable upload exists; full local resume/recovery orchestration is not complete. |

## Remaining Work Before Client Delivery

- [ ] Email alerts (success/failure) with SMTP or provider integration and settings UI.
- [ ] Production release pipeline for OTA (`publish` target, channel hosting, signed artifacts).
- [ ] Code-signing certificate setup (Windows installer signing).
- [ ] End-to-end QA matrix from Section 14 on real Tally datasets (Prime 3.x/4.x + ERP9).
- [ ] Stabilize/refresh legacy tests (current Jest suites include outdated paths and mixed module formats).
- [ ] Submit `https://tallybackup.iotsoft.in/sitemap.xml` in Google Search Console and verify indexing.
- [ ] Replace temporary OG image with a custom 1200x630 marketing banner for better share previews.

## What Was Added In This Pass

- Real Google Drive integration in main process (`main/sync/service.js`) and renderer screen wiring.
- Backup engine Drive sync hook after local backup completion.
- Profile-level Drive sync toggle support.
- Scheduler serialization to avoid parallel backup execution.
- Settings extension for Google OAuth configuration and persisted update channel behavior.
- DB compatibility migration helper for existing installs with old schema.
- VPS public website pages (`/`, `/about`, `/privacy`, `/terms`) for domain + Google OAuth policy requirements.
- SEO, OpenGraph, Twitter metadata, plus sitemap and robots support for discoverability.

## Validation Run Summary

- Renderer build: PASS (`npm run build:renderer`).
- Targeted lint on changed files: PASS with warnings only (console warnings).
- Full Jest suite: FAIL (pre-existing test environment and legacy test issues, plus native module version mismatch in test runtime).
- Direct Electron launch inside this environment: blocked by sandbox/OS access restrictions (not a code syntax error).
- VPS public route checks: PASS (`/`, `/about`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`).
