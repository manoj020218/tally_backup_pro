# OTA Update System - Testing Guide

## Overview

This guide covers comprehensive testing of the OTA (Over-The-Air) update infrastructure for TallyBackup Pro.

## Prerequisites

- Development environment with Node.js 18+
- Git repository access
- GitHub account with admin access to the tally_backup_pro repo
- Windows machine for binary testing

## Test Scenarios

### 1. Manual Update Check

**Purpose**: Verify update check mechanism works correctly

**Steps**:
1. Open TallyBackup Pro
2. Navigate to Settings → Updates
3. Click "Check for Updates Now"
4. Wait for check to complete

**Expected Results**:
- ✅ "Checking for Updates..." state shows while checking
- ✅ UI updates with status (no updates available / update found)
- ✅ Last check time updates
- ✅ No console errors

**Pass Criteria**: Check completes without errors, UI updates appropriately

---

### 2. Update Channel Switching

**Purpose**: Verify users can switch between update channels

**Steps**:
1. Open TallyBackup Pro
2. Navigate to Settings → Updates
3. Change channel dropdown from "Stable" to "Beta"
4. Observe settings update
5. Click "Check for Updates"

**Expected Results**:
- ✅ Channel change saved to store
- ✅ Update feed URL changes to beta channel
- ✅ Update check uses new channel
- ✅ No console errors

**Pass Criteria**: Channel switching works smoothly

---

### 3. Update Notification Display

**Purpose**: Verify update notifications display correctly

**Steps**:
1. Create a test release in GitHub repo (higher version than current)
2. Create v1.0.1 tag and push to trigger workflow
3. Wait for GitHub Actions to complete
4. In dev build, temporarily point updater to this test repo
5. Trigger update check
6. Wait for download

**Expected Results**:
- ✅ UpdateNotification component appears in bottom-right
- ✅ Shows update version and description
- ✅ Display stays on top (z-index: 1000)
- ✅ Styling matches design system

**Pass Criteria**: Notification displays and positions correctly

---

### 4. Update Download Progress

**Purpose**: Verify download progress is tracked and displayed

**Steps**:
1. Enable a slow network connection (or mock in dev tools)
2. Trigger update check with available update
3. When download starts, observe progress notification

**Expected Results**:
- ✅ Progress bar appears and fills smoothly
- ✅ Percentage updates correctly (0% → 100%)
- ✅ Bytes per second shows download speed
- ✅ Download/total size displays

**Pass Criteria**: Progress displays accurately in real-time

---

### 5. Snooze Update Notification

**Purpose**: Verify snooze functionality works

**Steps**:
1. Trigger update available notification
2. Click "Snooze (1h)" button
3. Verify notification disappears
4. Wait 1 hour (or manually trigger in dev tools)
5. Check if notification reappears

**Expected Results**:
- ✅ Notification hides when snoozed
- ✅ Can dismiss snoozed notification
- ✅ Notification re-appears after 1 hour

**Pass Criteria**: Snooze prevents notifications for 1 hour

---

### 6. Install Update Flow

**Purpose**: Verify update installation works

**Steps**:
1. Make update available
2. Download completes
3. Click "Restart & Install" button
4. App restarts and installs

**Expected Results**:
- ✅ App closes gracefully
- ✅ Update installs (background process)
- ✅ App starts with new version
- ✅ Check version in Settings → About

**Pass Criteria**: Update installs and app restarts with new version

---

### 7. Error Handling

**Purpose**: Verify errors are handled gracefully

**Steps**:
1. Simulate network error (disconnect from internet)
2. Trigger update check
3. Observe error handling
4. Reconnect and retry

**Expected Results**:
- ✅ Error notification displays
- ✅ Error message is user-friendly
- ✅ "Retry" button allows trying again
- ✅ App remains functional

**Pass Criteria**: Errors are caught and displayed appropriately

---

### 8. Periodic Update Checks

**Purpose**: Verify automatic update checks run periodically

**Steps**:
1. Run app in dev mode
2. Monitor console for update check logs
3. Wait 6 hours (or mock timer in tests)

**Expected Results**:
- ✅ Console shows "Checking for updates..." every 6 hours
- ✅ No errors in console
- ✅ App continues to work normally

**Pass Criteria**: Periodic checks occur without interruption

---

### 9. Release Script

**Purpose**: Verify release.js creates proper releases

**Steps**:
```bash
# Dry-run (no git changes)
npm run release --version 1.0.0 --channel stable --dry-run

# Beta release
npm run release --version 1.0.1-beta.1 --channel beta

# Check git tags
git tag -l
```

**Expected Results**:
- ✅ Version validation passes
- ✅ Git tags created with proper format (v1.0.0, v1.0.1-beta.1)
- ✅ Release notes generated
- ✅ Colored console output shows progress

**Pass Criteria**: Release script executes cleanly and creates proper artifacts

---

### 10. GitHub Actions Workflow

**Purpose**: Verify CI/CD pipeline works correctly

**Steps**:
1. Push a test tag: `git tag v1.0.1-test && git push origin v1.0.1-test`
2. Go to GitHub repo → Actions
3. Watch workflow execute
4. Check Release tab for created release

**Expected Results**:
- ✅ Workflow triggers on tag push
- ✅ All steps complete successfully
- ✅ Build artifacts uploaded to release
- ✅ Release shows exe files and latest.yml

**Pass Criteria**: Workflow completes without errors

---

### 11. IPC Communication

**Purpose**: Verify IPC handlers work correctly

**Steps**:
1. Open DevTools (F12)
2. In console:
```javascript
// Get status
window.electronAPI.ipcRenderer.invoke('update:getStatus').then(console.log);

// Check for updates
window.electronAPI.ipcRenderer.invoke('update:checkNow').then(console.log);

// Set channel
window.electronAPI.ipcRenderer.invoke('update:setChannel', 'beta').then(console.log);
```

**Expected Results**:
- ✅ All IPC calls return expected data
- ✅ No console errors
- ✅ Responses contain proper structure

**Pass Criteria**: IPC handlers respond correctly

---

### 12. Settings Integration

**Purpose**: Verify update settings persist

**Steps**:
1. Change update channel to "Beta"
2. Close app completely
3. Reopen app
4. Check Settings → Updates

**Expected Results**:
- ✅ Channel setting persisted to ElectronStore
- ✅ Setting loads on app restart
- ✅ Matches what was set before

**Pass Criteria**: Settings persist across restarts

---

## Integration Tests

### Test 1: Full Release Cycle

**Purpose**: Test complete flow from dev to user

**Steps**:
1. Update code with new feature
2. Run `npm run release --version 1.0.1`
3. Wait for GitHub Actions to complete
4. Download built exe
5. Install in test environment
6. Verify new feature works
7. Old version checks for update
8. Update downloads and installs
9. Verify new version running

**Pass Criteria**: Full cycle works without user intervention

---

### Test 2: Beta Channel Testing

**Purpose**: Test beta channel promotion

**Steps**:
1. Create beta release: `npm run release --version 1.0.1-beta.1 --channel beta`
2. User switches to beta channel
3. User gets beta update
4. Create stable release: `npm run release --version 1.0.1`
5. User switches back to stable
6. User gets stable update

**Pass Criteria**: Channel switching and updates work correctly

---

## Performance Tests

### Test 1: Memory Usage

**Purpose**: Verify updater doesn't leak memory

**Procedure**:
1. Open Task Manager or Process Explorer
2. Note initial memory usage
3. Trigger 10+ update checks
4. Monitor memory growth
5. Close app

**Pass Criteria**: Memory stable, no growth > 50MB

---

### Test 2: Update Check Speed

**Purpose**: Verify update checks are fast

**Procedure**:
1. Timestamp update check start
2. Monitor network requests
3. Timestamp check completion
4. Calculate elapsed time

**Pass Criteria**: Check completes in < 5 seconds on normal internet

---

### Test 3: Download Speed

**Purpose**: Verify downloads work efficiently

**Procedure**:
1. Monitor download start
2. Track file size and speed
3. Measure completion time

**Pass Criteria**: Download speed matches ISP speed (no unnecessary throttling)

---

## Security Tests

### Test 1: HTTPS Enforcement

**Purpose**: Verify all updates over HTTPS

**Procedure**:
1. Wireshark/similar tool to monitor traffic
2. Trigger update check
3. Monitor network requests

**Pass Criteria**: All requests to GitHub are HTTPS

---

### Test 2: Version Validation

**Purpose**: Verify only higher versions install

**Procedure**:
1. Modify update response to downgrade version
2. Trigger update check
3. Attempt to install

**Pass Criteria**: Downgrade rejected, message shown to user

---

### Test 3: Signature Validation (when enabled)

**Purpose**: Verify signed updates validated

**Procedure**:
1. Enable code signing in electron-builder.yml
2. Create release with valid signature
3. Create release with invalid signature (modified exe)
4. Try to install both

**Pass Criteria**: Invalid signature rejected, user notified

---

## Edge Cases

### Test 1: No Internet Connection

**Procedure**:
1. Disconnect from internet
2. Trigger update check
3. Wait for timeout

**Pass Criteria**: Graceful error, not crash

---

### Test 2: Interrupted Download

**Procedure**:
1. Start download
2. Kill internet mid-download
3. Retry

**Pass Criteria**: Download resumes or restarts without corruption

---

### Test 3: Rapid Channel Switching

**Procedure**:
1. Switch channel multiple times rapidly
2. Trigger checks

**Pass Criteria**: No crashes, last channel wins

---

### Test 4: Multiple Instances

**Procedure**:
1. Open multiple instances of app
2. Trigger update in one instance
3. Verify behavior in other instances

**Pass Criteria**: All instances notified of update

---

## Regression Tests

### Test 1: Backup Functionality

**Purpose**: Verify updates don't break backups

**Procedure**:
1. Complete backup successfully
2. Update app
3. Run backup with new version
4. Verify backup completes

**Pass Criteria**: Backups work after update

---

### Test 2: Settings Preservation

**Purpose**: Verify settings survive update

**Procedure**:
1. Configure app settings (backup profiles, email alerts, etc.)
2. Update app
3. Verify all settings still there

**Pass Criteria**: All settings preserved

---

## Manual Testing Checklist

- [ ] Manual update check works
- [ ] Channel switching works
- [ ] Update notification displays correctly
- [ ] Download progress shows
- [ ] Snooze functionality works
- [ ] Install update works
- [ ] Errors handled gracefully
- [ ] Periodic checks occur
- [ ] Release script works
- [ ] GitHub Actions workflow completes
- [ ] IPC handlers respond correctly
- [ ] Settings persist
- [ ] Full release cycle works
- [ ] Beta channel works
- [ ] Memory usage stable
- [ ] Update checks fast
- [ ] All requests HTTPS
- [ ] Version validation works
- [ ] No internet handled
- [ ] Interrupted download handled
- [ ] Backups still work
- [ ] Settings preserved

## Automation Testing

### Jest Unit Tests

```javascript
// __tests__/updater.test.js
describe('AppUpdater', () => {
  it('should initialize correctly', () => {
    const updater = require('../main/updater-config');
    expect(updater).toBeDefined();
  });

  it('should validate channels', () => {
    expect(['stable', 'beta', 'dev']).toContain('stable');
  });

  it('should parse semantic versions', () => {
    const versions = ['1.0.0', '1.0.1-beta.1', '2.0.0-dev'];
    versions.forEach(v => expect(v).toMatch(/^\d+\.\d+\.\d+/));
  });
});
```

### Playwright E2E Tests

```javascript
// tests/e2e/update.spec.js
test('should show update notification', async ({ page }) => {
  await page.goto('about:blank');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('update:available', {
      detail: { version: '1.0.1' }
    }));
  });
  
  const notification = await page.waitForSelector('[data-testid="update-notification"]');
  expect(notification).toBeTruthy();
});
```

## Troubleshooting

### Update check hangs
- Check network connection
- Verify GitHub repo is accessible
- Check firewall/proxy settings
- Review console for error messages

### Update downloads fail
- Verify disk space available
- Check GitHub release exists
- Verify artifact names correct
- Check Windows temp folder permissions

### App won't restart after update
- Check logs in %APPDATA%/TallyBackupPro
- Verify installer has admin rights
- Check NSIS installer not corrupted
- Try manual installation

### Version number wrong after update
- Check package.json version updated
- Verify app.getVersion() reading correct source
- Check version in NSIS installer metadata

## Test Results Template

```
Test Date: ________________
Tester: ___________________
Version: __________________
Channel: __________________

Test Results:
[ ] Scenario 1: PASS / FAIL / N/A
    Notes: _______________

[ ] Scenario 2: PASS / FAIL / N/A
    Notes: _______________

[ ] Scenario 3: PASS / FAIL / N/A
    Notes: _______________

Overall Result: PASS / FAIL
Issues Found: ______________
```

## Continuous Integration

### GitHub Actions Status

Monitor at: https://github.com/manoj020218/tally_backup_pro/actions

Expected outcomes for each workflow run:
1. ✅ Checkout succeeds
2. ✅ Install dependencies succeeds
3. ✅ Build succeeds
4. ✅ Create release succeeds
5. ✅ Artifacts uploaded

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Status**: Ready for Testing
