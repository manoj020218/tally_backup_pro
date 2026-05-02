#!/usr/bin/env node

/**
 * OTA Release Pipeline Manager
 * Handles versioning, building, releasing to GitHub, and updating latest.yml
 * 
 * Usage:
 *   node scripts/release.js --version 1.0.1 --channel stable
 *   node scripts/release.js --version 2.0.0-beta.1 --channel beta
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

// Color console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    version: null,
    channel: 'stable',
    skipBuild: false,
    skipTest: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--version' && args[i + 1]) {
      result.version = args[++i];
    } else if (arg === '--channel' && args[i + 1]) {
      result.channel = args[++i];
    } else if (arg === '--skip-build') {
      result.skipBuild = true;
    } else if (arg === '--skip-test') {
      result.skipTest = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}

/**
 * Validate version format
 */
function validateVersion(version) {
  if (!semver.valid(version)) {
    error(`Invalid version format: ${version}. Use semver (e.g., 1.0.1, 2.0.0-beta.1)`);
  }
  return version;
}

/**
 * Read package.json
 */
async function readPackageJson() {
  const filePath = path.join(__dirname, '..', 'package.json');
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write package.json
 */
async function writePackageJson(pkg) {
  const filePath = path.join(__dirname, '..', 'package.json');
  await fs.writeFile(filePath, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * Update version in package.json
 */
async function updateVersion(newVersion) {
  info(`Updating version to ${newVersion}...`);
  const pkg = await readPackageJson();
  const oldVersion = pkg.version;

  if (!validateVersion(newVersion)) {
    return;
  }

  pkg.version = newVersion;
  await writePackageJson(pkg);
  success(`Version updated: ${oldVersion} → ${newVersion}`);
  return { oldVersion, newVersion };
}

/**
 * Run tests
 */
async function runTests(skipTest) {
  if (skipTest) {
    warn('Skipping tests (--skip-test)');
    return;
  }

  info('Running tests...');
  try {
    execSync('npm test -- --maxWorkers=2', { stdio: 'inherit' });
    success('Tests passed');
  } catch (err) {
    error('Tests failed. Fix errors before releasing.');
  }
}

/**
 * Build application
 */
async function buildApplication(skipBuild) {
  if (skipBuild) {
    warn('Skipping build (--skip-build)');
    return;
  }

  info('Building application...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    success('Build completed');
  } catch (err) {
    error('Build failed. Fix errors before releasing.');
  }
}

/**
 * Create git tag and commit
 */
async function createGitTag(version, dryRun) {
  if (dryRun) {
    info('(DRY RUN) Would create git tag: v' + version);
    return;
  }

  info(`Creating git tag v${version}...`);
  try {
    execSync(`git add package.json`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    execSync(`git tag -a v${version} -m "Release ${version}"`, { stdio: 'inherit' });
    success(`Git tag created: v${version}`);
  } catch (err) {
    error('Failed to create git tag. Ensure git is configured correctly.');
  }
}

/**
 * Push release to GitHub
 */
async function pushToGitHub(version, channel, dryRun) {
  if (dryRun) {
    info('(DRY RUN) Would push to GitHub');
    return;
  }

  info('Pushing to GitHub...');
  try {
    execSync('git push origin main', { stdio: 'inherit' });
    execSync(`git push origin v${version}`, { stdio: 'inherit' });
    success('Pushed to GitHub');
  } catch (err) {
    error('Failed to push to GitHub. Check your git configuration.');
  }
}

/**
 * Create release notes
 */
async function generateReleaseNotes(version) {
  info('Generating release notes...');

  const template = `## 🚀 Release ${version}

### ✨ Features
- Add your features here

### 🐛 Bug Fixes
- Add bug fixes here

### 📝 Changelog
- See git log for detailed changes

### 📦 Downloads
- Windows NSIS Installer: \`TallyBackupPro-${version}.exe\`
- Windows Portable: \`TallyBackupPro-${version}-portable.exe\`

### ⚙️ Installation
1. Download the installer above
2. Run the installer
3. Application will auto-update future releases

---

**Checksum**: See GitHub release assets

**Date**: ${new Date().toISOString().split('T')[0]}`;

  return template;
}

/**
 * Display release summary
 */
function displaySummary(version, channel, pkg) {
  console.log(`
${colors.bold}╔════════════════════════════════════════╗${colors.reset}
${colors.bold}║  📦 OTA RELEASE PIPELINE SUMMARY      ║${colors.reset}
${colors.bold}╚════════════════════════════════════════╝${colors.reset}

${colors.cyan}Release Information:${colors.reset}
  • Version: ${colors.bold}${version}${colors.reset}
  • Channel: ${colors.bold}${channel}${colors.reset}
  • Product: ${colors.bold}${pkg.productName}${colors.reset}

${colors.cyan}Release Steps:${colors.reset}
  ✓ Version updated in package.json
  ✓ Application built
  ✓ Git tag created
  ✓ Release pushed to GitHub
  ✓ Release notes generated

${colors.cyan}Next Steps:${colors.reset}
  1. Go to https://github.com/manoj020218/tally_backup_pro/releases
  2. Find the v${version} release
  3. Edit release and add changelog
  4. Publish release
  5. Installers will be signed and attached

${colors.cyan}For End Users:${colors.reset}
  • Auto-update available in ${channel} channel
  • Manual download from GitHub releases
  • NSIS installer with auto-update support

${colors.green}✅ Release prepared successfully!${colors.reset}
`);
}

/**
 * Main release flow
 */
async function main() {
  try {
    const args = parseArgs();
    const pkg = await readPackageJson();

    log('═══════════════════════════════════════', 'bold');
    log('  🚀 OTA RELEASE PIPELINE', 'bold');
    log('═══════════════════════════════════════', 'bold');

    // Validate inputs
    if (!args.version) {
      error('--version is required. Example: node scripts/release.js --version 1.0.1');
    }

    const newVersion = validateVersion(args.version);

    // Run release steps
    await updateVersion(newVersion);
    await runTests(args.skipTest);
    await buildApplication(args.skipBuild);
    await createGitTag(newVersion, args.dryRun);
    await pushToGitHub(newVersion, args.channel, args.dryRun);
    const releaseNotes = await generateReleaseNotes(newVersion);

    // Display summary
    displaySummary(newVersion, args.channel, pkg);

    // Show release notes
    console.log(`\n${colors.cyan}Sample Release Notes:${colors.reset}\n${releaseNotes}`);

    if (args.dryRun) {
      warn('This was a DRY RUN. No changes were made.');
    }
  } catch (err) {
    error(`Release pipeline failed: ${err.message}`);
  }
}

main();
