const cron = require('node-cron');
const { getAllBackupProfiles } = require('./db/queries');
const { BackupEngine } = require('./backup/engine');

let scheduledJobs = [];

async function initScheduler(mainWindow) {
  try {
    const profiles = getAllBackupProfiles();
    
    profiles.forEach(profile => {
      if (profile.schedule_cron && profile.is_active) {
        scheduleBackup(profile, mainWindow);
      }
    });

    console.log(\`? Scheduler initialized with \${profiles.length} profiles\`);
  } catch (error) {
    console.error('Scheduler initialization failed:', error);
  }
}

function scheduleBackup(profile, mainWindow) {
  try {
    const job = cron.schedule(profile.schedule_cron, async () => {
      console.log(\`Running scheduled backup for: \${profile.name}\`);
      
      try {
        const { getDatabase } = require('./db');
        const db = getDatabase();
        const engine = new BackupEngine(db);
        
        const result = await engine.runBackup(profile);
        
        mainWindow.webContents.send('backup:scheduled-complete', {
          profileId: profile.id,
          ...result
        });
      } catch (error) {
        console.error('Scheduled backup failed:', error);
        mainWindow.webContents.send('backup:scheduled-error', {
          profileId: profile.id,
          error: error.message
        });
      }
    });

    scheduledJobs.push({ profileId: profile.id, job });
    console.log(\`? Scheduled backup for: \${profile.name}\`);
  } catch (error) {
    console.error(\`Failed to schedule backup for \${profile.name}:\`, error);
  }
}

async function stopScheduler() {
  scheduledJobs.forEach(({ job }) => {
    job.stop();
  });
  scheduledJobs = [];
  console.log('? Scheduler stopped');
}

module.exports = {
  initScheduler,
  stopScheduler,
  scheduleBackup
};
