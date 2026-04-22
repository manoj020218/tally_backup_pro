const { _electron: electron } = require('playwright');

describe('TallyBackup Pro E2E', () => {
  let electronApp;
  let page;

  beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should display main dashboard', async () => {
    // Check if main title is visible
    const title = await page.locator('h1').textContent();
    expect(title).toBe('TallyBackup Pro');
  });

  test('should navigate to settings', async () => {
    // Assuming there's a navigation menu
    const settingsLink = page.locator('a[href*="settings"], button:has-text("Settings")').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();

      // Check if settings page loaded
      const settingsTitle = page.locator('h1:has-text("Settings")');
      await expect(settingsTitle).toBeVisible();
    }
  });

  test('should show backup profiles', async () => {
    const profilesSection = page.locator('h3:has-text("Backup Profiles")');
    await expect(profilesSection).toBeVisible();
  });

  test('should handle backup profile creation', async () => {
    // Navigate to backup profiles
    const profilesLink = page.locator('a[href*="profiles"], button:has-text("Profiles")').first();
    if (await profilesLink.isVisible()) {
      await profilesLink.click();

      // Click add profile button
      const addButton = page.locator('button:has-text("Add Profile")');
      if (await addButton.isVisible()) {
        await addButton.click();

        // Fill form
        await page.fill('input[placeholder*="Profile Name"]', 'Test Profile');
        await page.fill('input[placeholder*="Tally Company"]', 'Test Company');
        await page.selectOption('select', 'full');

        // Submit form
        await page.click('button[type="submit"]:has-text("Create")');

        // Verify profile was added
        const profileName = page.locator('text=Test Profile');
        await expect(profileName).toBeVisible();
      }
    }
  });

  test('should display backup history', async () => {
    const historySection = page.locator('h3:has-text("Recent Backups"), h1:has-text("Backup History")');
    await expect(historySection.first()).toBeVisible();
  });

  test('should show status indicators', async () => {
    // Check for status badges
    const statusBadges = page.locator('.inline-flex.items-center.px-2\\.5.py-0\\.5');
    const count = await statusBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});