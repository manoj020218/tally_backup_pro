const { getSetting, setSetting } = require("../db/queries");

const QUEUE_SETTING_KEY = "xml_backup_queue_v1";

function safeParseQueue(value) {
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function readQueue() {
  return safeParseQueue(getSetting(QUEUE_SETTING_KEY));
}

function writeQueue(queue) {
  const normalized = Array.isArray(queue) ? queue : [];
  setSetting(QUEUE_SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}

function listQueuedBackups() {
  return readQueue();
}

function enqueueBackupJob(job = {}) {
  const profileId = String(job.profileId || "").trim();
  if (!profileId) {
    throw new Error("profileId is required to queue backup.");
  }

  const queue = readQueue();
  const deduped = queue.filter((item) => String(item.profileId || "") !== profileId);
  deduped.push({
    profileId,
    queuedAt: job.queuedAt || new Date().toISOString(),
    reason: job.reason || "tally_disconnected"
  });

  return writeQueue(deduped);
}

function removeQueuedBackupJob(profileId) {
  const target = String(profileId || "").trim();
  const queue = readQueue();
  const next = queue.filter((item) => String(item.profileId || "") !== target);
  writeQueue(next);
  return next;
}

function clearQueuedBackups() {
  return writeQueue([]);
}

module.exports = {
  QUEUE_SETTING_KEY,
  listQueuedBackups,
  enqueueBackupJob,
  removeQueuedBackupJob,
  clearQueuedBackups
};
