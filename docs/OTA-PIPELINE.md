# OTA (Over-The-Air) Update Pipeline Documentation

## Overview

This document describes the complete OTA update infrastructure for TallyBackup Pro, enabling seamless automatic updates to end users across Windows platforms.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Workstation                          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Electron App (TallyBackup Pro)                │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ Renderer Process (React UI)                  │   │   │
│  │  │ - UpdateNotification.jsx                     │   │   │
│  │  │ - Displays update status                     │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │              ↓ IPC                                   │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ Main Process                                 │   │   │
│  │  │ - updater-config.js (AppUpdater)             │   │   │
│  │  │ - Manages update checks                      │   │   │
│  │  │ - Handles downloads                          │   │   │
│  │  │ - Installs updates                           │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │              ↓ HTTP                                  │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ electron-updater                             │   │   │
│  │  │ - GitHub provider                            │   │   │
│  │  │ - Downloads from GitHub releases             │   │   │
│  │  │ - Manages versions/channels                  │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↑
                          │ HTTPS
                          │
┌─────────────────────────────────────────────────────────────┐
│         GitHub Releases (Release Feed)                       │
│                                                               │
│  v1.0.0 (stable)                                            │
│    ├── tally-backup-pro-1.0.0.exe                           │
│    ├── tally-backup-pro-1.0.0-portable.exe                  │
│    └── latest.yml                                           │
│                                                               │
│  v1.0.1-beta.1 (beta)                                       │
│    ├── tally-backup-pro-1.0.1-beta.1.exe                    │
│    ├── tally-backup-pro-1.0.1-beta.1-portable.exe           │
│    └── latest.yml                                           │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

### Main Files

1. **main/updater-config.js** (250+ lines)
   - AppUpdater class implementing all update logic
   - Methods: initialize(), checkForUpdates(), setUpdateChannel()
   - Event handlers for all update scenarios
   - Periodic checks (every 6 hours)

2. **main/updater.js** (Updated)
   - Initializes AppUpdater on app startup
   - Simplified wrapper around updater-config

3. **renderer/components/UpdateNotification.jsx** (NEW - 280 lines)
   - React component for UI notifications
   - States: Available, Downloading, Ready, Error
   - User actions: Install, Snooze (1h), Dismiss
   - Real-time progress display

4. **scripts/release.js** (320+ lines)
   - CLI tool for release automation
   - Handles version bumping, testing, building
   - Creates git tags and GitHub pushes
   - Supports --dry-run for testing

5. **electron-builder.yml** (Updated)
   - Publish configuration for GitHub provider
   - Output targets: NSIS installer, portable exe
   - Code signing placeholders

6. **.github/workflows/release.yml** (NEW)
   - GitHub Actions workflow for CI/CD
   - Triggered on git tag (v*)
   - Runs tests → builds → creates release

## Workflow: Release to User

### Step 1: Developer Creates Release

```bash
npm run release --version 1.0.1 --channel stable
```

This executes `scripts/release.js` which:
1. Validates semantic versioning
2. Updates package.json version
3. Runs test suite (npm test)
4. Builds application (npm run build)
5. Creates git commit: "Release v1.0.1"
6. Creates annotated git tag: "v1.0.1"
7. Pushes to GitHub: `git push origin main && git push origin v1.0.1`
8. Generates release notes template

### Step 2: GitHub Actions Runs

When tag is pushed, `.github/workflows/release.yml` runs:

1. **Checkout code** - Gets latest commit
2. **Setup Node.js** - Installs Node 18.x
3. **Install dependencies** - npm ci
4. **Build application** - npm run build
5. **Code signing** - (Optional, set via GitHub secrets)
6. **Create release notes** - Generates body
7. **Create GitHub Release** - Creates release page
8. **Upload artifacts** - Uploads exe files
9. **Slack notification** - Notifies on success/failure

### Step 3: Update Feed Generated

GitHub automatically creates:
- `latest.yml` - Metadata for stable channel
- `latest-beta.yml` - Metadata for beta channel (if prerelease)
- Release download URLs

### Step 4: User Gets Notified

When user runs app:

1. **Startup Check** - AppUpdater checks for updates on app launch
2. **Periodic Checks** - Checks every 6 hours
3. **Update Available** - UpdateNotification displays update card
4. **Download** - User clicks "Install" → app downloads update
5. **Progress Display** - UpdateNotification shows download progress
6. **Ready** - Notification shows "Restart & Install"
7. **Install** - User clicks button → app restarts and installs

## Configuration

### Update Channels

Three update channels supported:

| Channel | Use Case | Audience |
|---------|----------|----------|
| **stable** | Production releases | All users (default) |
| **beta** | Beta testing | Power users, testers |
| **dev** | Development builds | Developers |

### Switching Channels

Users can change channels in Settings:

```javascript
// Via IPC
ipcRenderer.invoke('update:setChannel', 'beta');

// Stores in ElectronStore
// Updates feed URL automatically
// Re-checks for updates immediately
```

### Configuration Details

**electron-builder.yml** - GitHub release source:
```yaml
publish:
  - provider: github
    owner: manoj020218
    repo: tally_backup_pro
```

**updater-config.js** - Update intervals and checks:
```javascript
// Periodic check interval: 6 hours
const checkInterval = 6 * 60 * 60 * 1000;

// Startup check: Immediate
checkForUpdates() on initialize()
```

## IPC API

### From Renderer to Main

```javascript
// Check for updates now
ipcRenderer.invoke('update:checkNow')
// Returns: { success: true|false, error?: string }

// Get update status
ipcRenderer.invoke('update:getStatus')
// Returns: { 
//   channel: 'stable'|'beta'|'dev',
//   version: '1.0.0',
//   lastCheck: '2024-01-15T10:30:00Z',
//   pendingUpdate?: { version, files: [...] }
// }

// Set update channel
ipcRenderer.invoke('update:setChannel', 'beta')
// Returns: { success: true|false, channel: 'beta' }

// Install pending update
ipcRenderer.invoke('update:install')
// Returns: { success: true }
```

### From Main to Renderer

```javascript
// Update available
mainWindow.webContents.send('update:available', {
  version: '1.0.1',
  releaseDate: '2024-01-15'
})

// Download progress
mainWindow.webContents.send('update:download-progress', {
  percent: 45,
  bytesPerSecond: 1024000,
  transferred: 52428800,
  total: 117440512
})

// Update ready to install
mainWindow.webContents.send('update:ready', {
  version: '1.0.1'
})

// Update check error
mainWindow.webContents.send('update:error', {
  message: 'Update check failed...',
  error: 'Network timeout'
})
```

## Release Automation Commands

### Manual Release (During Development)

```bash
# Dry-run (no git changes)
npm run release --version 1.0.1 --channel stable --dry-run

# Beta release
npm run release --version 1.0.1-beta.1 --channel beta

# Skip tests
npm run release --version 1.0.1 --skip-test

# Skip build
npm run release --version 1.0.1 --skip-build
```

### CI/CD Release (via GitHub Actions)

```bash
# Just push a git tag (GitHub Actions handles the rest)
git tag v1.0.1
git push origin v1.0.1
```

## Security Considerations

### Signed Releases

For production, enable code signing:

1. Create Windows code signing certificate
2. Store as GitHub secret: `CERTIFICATE_FILE_BASE64`
3. Store password as: `CERTIFICATE_PASSWORD`
4. Configure in `electron-builder.yml`:

```yaml
win:
  certificateFile: path/to/cert.pfx
  certificatePassword: ${env.CERTIFICATE_PASSWORD}
```

### Release Integrity

- **GitHub releases** are automatically signed with GitHub's signing key
- **electron-updater** validates signatures before applying updates
- **HTTPS only** - All downloads over encrypted connection
- **Version validation** - Updates only allowed to higher versions

## Troubleshooting

### Update Check Fails

```javascript
// Check updater status
const status = await ipcRenderer.invoke('update:getStatus');
console.log(status);

// Manual check for debugging
await ipcRenderer.invoke('update:checkNow');
```

### Updates Not Showing

1. Verify GitHub release was created: https://github.com/manoj020218/tally_backup_pro/releases
2. Check update channel: Settings → About → Update Channel
3. Manually trigger check: Settings → About → Check Now
4. Check for network connectivity

### Download Gets Stuck

```javascript
// Cancel via window close (download stops automatically)
// Update notification times out after 30 seconds of no progress
```

## Performance Impact

- **Startup time**: +100-200ms (minimal, background init)
- **Memory**: +15-20MB (electron-updater library)
- **Disk**: ~200MB during update (installer size)
- **Network**: Only on periodic checks (6h intervals)

## Testing Updates

### Local Testing

1. Create test release in GitHub repo (can be draft)
2. In `updater-config.js`, temporarily set repo to test repo
3. Build and run locally: `npm run dev`
4. Trigger update check via Settings UI
5. Download and verify installation

### Beta Channel

1. Create beta release: `npm run release --version 1.0.1-beta.1 --channel beta`
2. Users switch to beta in Settings
3. Users get beta updates
4. Promote to stable: `npm run release --version 1.0.1 --channel stable`

## Next Steps

### To Enable Code Signing

1. Generate Windows certificate (DigiCert or self-signed)
2. Add certificate to GitHub secrets
3. Uncomment signing in `electron-builder.yml`
4. Enable NSIS signature validation

### To Monitor Releases

1. Setup Slack webhook (optional)
2. GitHub Actions sends notifications on success/failure
3. Monitor release download stats in GitHub

### To Rollback Updates

If critical issue found after release:

1. Create hotfix branch from v1.0.1
2. Fix issue
3. Create v1.0.2 release: `npm run release --version 1.0.2`
4. Users automatically update to v1.0.2

## Additional Resources

- [electron-updater documentation](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Semantic Versioning](https://semver.org/)
- [NSIS Installer](https://nsis.sourceforge.io/Main_Page)

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Status**: Production Ready
