const logger = require('../utils/logger');

const PROCTORING_EVENTS = {
  PHONE_DETECTED: 'phone_detected',
  LOOKING_AWAY: 'looking_away',
  TAB_SWITCH: 'tab_switch',
  WINDOW_MINIMIZE: 'window_minimize',
  CAMERA_BLOCKED: 'camera_blocked',
  MICROPHONE_DISABLED: 'microphone_disabled',
  CLIPBOARD_ACCESS: 'clipboard_access',
  COPY_PASTE: 'copy_paste',
  MULTIPLE_MONITORS: 'multiple_monitors',
  MULTIPLE_FACES: 'multiple_faces',
};

const SEVERITY = {
  [PROCTORING_EVENTS.PHONE_DETECTED]: 'high',
  [PROCTORING_EVENTS.LOOKING_AWAY]: 'medium',
  [PROCTORING_EVENTS.TAB_SWITCH]: 'critical',
  [PROCTORING_EVENTS.WINDOW_MINIMIZE]: 'high',
  [PROCTORING_EVENTS.CAMERA_BLOCKED]: 'critical',
  [PROCTORING_EVENTS.MICROPHONE_DISABLED]: 'high',
  [PROCTORING_EVENTS.CLIPBOARD_ACCESS]: 'medium',
  [PROCTORING_EVENTS.COPY_PASTE]: 'high',
  [PROCTORING_EVENTS.MULTIPLE_MONITORS]: 'low',
  [PROCTORING_EVENTS.MULTIPLE_FACES]: 'critical',
};

const eventLogs = {};

const advancedProctoring = {
  logEvent(sessionId, eventType, details = {}) {
    if (!eventLogs[sessionId]) {
      eventLogs[sessionId] = [];
    }

    const entry = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      eventType,
      severity: SEVERITY[eventType] || 'medium',
      timestamp: new Date().toISOString(),
      details,
    };

    eventLogs[sessionId].push(entry);

    logger.warn('system', `Proctoring event: ${eventType}`, {
      sessionId,
      severity: entry.severity,
      details,
    });

    return entry;
  },

  getSessionEvents(sessionId) {
    return eventLogs[sessionId] || [];
  },

  getAllEvents() {
    const all = [];
    for (const [sessionId, events] of Object.entries(eventLogs)) {
      all.push(...events.map((e) => ({ ...e, sessionId })));
    }
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  getViolationCount(sessionId) {
    const events = this.getSessionEvents(sessionId);
    const critical = events.filter((e) => e.severity === 'critical').length;
    const high = events.filter((e) => e.severity === 'high').length;
    const medium = events.filter((e) => e.severity === 'medium').length;
    return { total: events.length, critical, high, medium };
  },

  shouldTerminate(sessionId, maxCritical = 3, maxHigh = 5) {
    const counts = this.getViolationCount(sessionId);
    if (counts.critical >= maxCritical) {
      return { terminate: true, reason: `Interview terminated: ${counts.critical} critical proctoring violations` };
    }
    if (counts.high >= maxHigh) {
      return { terminate: true, reason: `Interview terminated: ${counts.high} high-severity proctoring violations` };
    }
    return { terminate: false, reason: null };
  },

  generateEvidenceReport(sessionId) {
    const events = this.getSessionEvents(sessionId);
    if (events.length === 0) {
      return { sessionId, totalEvents: 0, status: 'clean', evidence: [] };
    }

    const grouped = {};
    for (const event of events) {
      if (!grouped[event.eventType]) {
        grouped[event.eventType] = { eventType: event.eventType, count: 0, severity: event.severity, firstOccurrence: event.timestamp, lastOccurrence: event.timestamp };
      }
      grouped[event.eventType].count++;
      grouped[event.eventType].lastOccurrence = event.timestamp;
    }

    const evidence = Object.values(grouped).map((g) => ({
      type: g.eventType,
      count: g.count,
      severity: g.severity,
      firstOccurrence: g.firstOccurrence,
      lastOccurrence: g.lastOccurrence,
      description: getEventDescription(g.eventType, g.count),
    }));

    const totalScore = Math.max(0, 100 - events.length * 5);
    const status = events.length === 0 ? 'clean' : events.length <= 3 ? 'minor_violations' : 'multiple_violations';

    return {
      sessionId,
      totalEvents: events.length,
      status,
      proctoringScore: totalScore,
      evidence,
      generatedAt: new Date().toISOString(),
    };
  },

  clearSession(sessionId) {
    delete eventLogs[sessionId];
  },
};

function getEventDescription(type, count) {
  const descriptions = {
    [PROCTORING_EVENTS.PHONE_DETECTED]: `Phone detected ${count} time(s) during interview`,
    [PROCTORING_EVENTS.LOOKING_AWAY]: `Looking away detected ${count} time(s)`,
    [PROCTORING_EVENTS.TAB_SWITCH]: `Tab switch detected ${count} time(s)`,
    [PROCTORING_EVENTS.WINDOW_MINIMIZE]: `Window minimize detected ${count} time(s)`,
    [PROCTORING_EVENTS.CAMERA_BLOCKED]: `Camera blocked ${count} time(s)`,
    [PROCTORING_EVENTS.MICROPHONE_DISABLED]: `Microphone disabled ${count} time(s)`,
    [PROCTORING_EVENTS.CLIPBOARD_ACCESS]: `Clipboard access detected ${count} time(s)`,
    [PROCTORING_EVENTS.COPY_PASTE]: `Copy-paste detected ${count} time(s)`,
    [PROCTORING_EVENTS.MULTIPLE_MONITORS]: `Multiple monitors detected`,
    [PROCTORING_EVENTS.MULTIPLE_FACES]: `Multiple faces detected ${count} time(s)`,
  };
  return descriptions[type] || `${type} detected ${count} time(s)`;
}

module.exports = { advancedProctoring, PROCTORING_EVENTS };
