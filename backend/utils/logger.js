const fs = require('fs');
const path = require('path');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
const LOG_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

const categories = ['interview', 'api', 'auth', 'emotion', 'speech', 'system', 'performance'];

let streams = {};

function getStream(category) {
  if (!categories.includes(category)) category = 'system';
  if (streams[category]) return streams[category];
  ensureDir();
  const filePath = path.join(LOG_DIR, `${category}.log`);
  streams[category] = fs.createWriteStream(filePath, { flags: 'a' });
  return streams[category];
}

let intervalId = null;

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function rotate(category) {
  const filePath = path.join(LOG_DIR, `${category}.log`);
  if (!fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (stat.size < MAX_SIZE) return;
  if (streams[category]) {
    streams[category].end();
    delete streams[category];
  }
  for (let i = MAX_FILES - 1; i >= 1; i--) {
    const oldPath = path.join(LOG_DIR, `${category}.${i}.log`);
    const newPath = path.join(LOG_DIR, `${category}.${i + 1}.log`);
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }
  }
  const firstPath = path.join(LOG_DIR, `${category}.1.log`);
  fs.renameSync(filePath, firstPath);
}

function rotateAll() {
  categories.forEach(rotate);
}

function startRotation(intervalMs = 60000) {
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(rotateAll, intervalMs);
  if (intervalId.unref) intervalId.unref();
}

function stopRotation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function log(level, category, message, data = null) {
  if (level < CURRENT_LEVEL) return;
  const timestamp = new Date().toISOString();
  const levelName = LOG_NAMES[level] || 'UNKNOWN';
  const logLine = data
    ? `[${timestamp}] [${levelName}] [${category}] ${message} ${JSON.stringify(data)}\n`
    : `[${timestamp}] [${levelName}] [${category}] ${message}\n`;
  const stream = getStream(category);
  stream.write(logLine);
  if (level >= LOG_LEVELS.warn) {
    console.error(logLine.trim());
  }
}

const logger = {
  debug: (category, message, data) => log(0, category, message, data),
  info: (category, message, data) => log(1, category, message, data),
  warn: (category, message, data) => log(2, category, message, data),
  error: (category, message, data) => log(3, category, message, data),
  fatal: (category, message, data) => log(4, category, message, data),
  startRotation,
  stopRotation,
  rotateAll,
};

module.exports = logger;
