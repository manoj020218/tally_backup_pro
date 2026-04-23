const cron = require("node-cron");
const { pingTally } = require("./tally/connector");
const {
  getAllBackupProfiles,
  getBackupProfileById,
  getSetting
} = require("./db/queries");
const { BackupEngine } = require("./backup/engine");
const {
  listQueuedBackups,
  removeQueuedBackupJob
} = require("./backup/xml-queue");

let scheduledJobs = [];
let reconnectInterval = null;
let wasDisconnected = false;
let isProcessingQueue = false;

async function runProfileBackup(profile, mainWindow, trigger = "scheduled") {
  const { getDatabase } = require("./db");
  const db = getDatabase();
  const engine = new BackupEngine(db);
  const result = await engine.runBackup(profile);

  if (trigger === "queued") {
    mainWindow.webContents.send("backup:scheduled-complete", {
      profileId: profile.id,
      trigger: "queued-retry",
      ...result
    });
  } else {
    mainWindow.webContents.send("backup:scheduled-complete", {
      profileId: profile.id,
      ...result
    });
  }

  return result;
}

async function processQueuedBackups(mainWindow) {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    const queued = listQueuedBackups();
    if (!Array.isArray(queued) || queued.length === 0) {
      return;
    }

    for (const job of queued) {
      const profileId = String(job.profileId || "").trim();
      if (!profileId) continue;

      const profile = getBackupProfileById(profileId);
      if (!profile || !profile.is_active) {
        removeQueuedBackupJob(profileId);
        continue;
      }

      try {
        await runProfileBackup(profile, mainWindow, "queued");
        removeQueuedBackupJob(profileId);
      } catch (error) {
        console.error(`Queued backup failed for profile ${profileId}:`, error.message);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

function getTallyPortForMonitor() {
  const raw = getSetting("tally_port");
  const parsed = Number.parseInt(String(raw || "9000"), 10);
  return Number.isFinite(parsed) ? parsed : 9000;
}

function startReconnectMonitor(mainWindow) {
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }

  reconnectInterval = setInterval(async () => {
    try {
      const status = await pingTally(getTallyPortForMonitor());
      if (!status.connected) {
        wasDisconnected = true;
        return;
      }

      if (wasDisconnected) {
        wasDisconnected = false;
        await processQueuedBackups(mainWindow);
      }
    } catch (_error) {
      wasDisconnected = true;
    }
  }, 30000);
}

async function initScheduler(mainWindow) {
  try {
    const profiles = getAllBackupProfiles();

    profiles.forEach((profile) => {
      if (profile.schedule_cron && profile.is_active) {
        scheduleBackup(profile, mainWindow);
      }
    });

    startReconnectMonitor(mainWindow);
    console.log(`Scheduler initialized with ${profiles.length} profiles`);
  } catch (error) {
    console.error("Scheduler initialization failed:", error);
  }
}

function scheduleBackup(profile, mainWindow) {
  try {
    const job = cron.schedule(profile.schedule_cron, async () => {
      console.log(`Running scheduled backup for: ${profile.name}`);

      try {
        await runProfileBackup(profile, mainWindow, "scheduled");
      } catch (error) {
        console.error("Scheduled backup failed:", error);
        mainWindow.webContents.send("backup:scheduled-error", {
          profileId: profile.id,
          error: error.message
        });
      }
    });

    scheduledJobs.push({ profileId: profile.id, job });
    console.log(`Scheduled backup for: ${profile.name}`);
  } catch (error) {
    console.error(`Failed to schedule backup for ${profile.name}:`, error);
  }
}

async function stopScheduler() {
  scheduledJobs.forEach(({ job }) => {
    job.stop();
  });
  scheduledJobs = [];

  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }

  console.log("Scheduler stopped");
}

module.exports = {
  initScheduler,
  stopScheduler,
  scheduleBackup,
  processQueuedBackups
};
