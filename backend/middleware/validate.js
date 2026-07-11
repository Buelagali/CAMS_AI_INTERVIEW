const { AppError } = require('./errorHandler');

const validators = {
  sessionId: (val) => typeof val === 'string' && val.length > 0 && val.length <= 64,
  role: (val) => typeof val === 'string' && val.length > 0 && val.length <= 100,
  name: (val) => typeof val === 'string' && val.length > 0 && val.length <= 200,
  email: (val) => typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  text: (val) => typeof val === 'string' && val.length > 0 && val.length <= 50000,
  imageBase64: (val) => typeof val === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(val) && val.length <= 5 * 1024 * 1024,
  audioBase64: (val) => typeof val === 'string' && val.length <= 10 * 1024 * 1024,
  fileSize: (val, max) => typeof val === 'number' && val > 0 && val <= max,
  positiveInt: (val) => typeof val === 'number' && Number.isInteger(val) && val > 0,
  boolean: (val) => typeof val === 'boolean',
  array: (val) => Array.isArray(val),
  object: (val) => typeof val === 'object' && val !== null && !Array.isArray(val),
  jwtToken: (val) => typeof val === 'string' && val.split('.').length === 3,
};

const rules = {
  'POST /api/auth/token': {
    body: {
      sessionId: ['sessionId'],
    },
  },
  'POST /api/auth/verify': {
    body: {
      token: ['jwtToken'],
    },
  },
  'POST /api/interview/session': {
    body: {
      name: ['name'],
      email: ['email'],
      role: ['role'],
    },
  },
  'GET /api/interview/session/:sessionId': {
    params: {
      sessionId: ['sessionId'],
    },
  },
  'POST /api/interview/session/:sessionId/answer': {
    params: {
      sessionId: ['sessionId'],
    },
    body: {
      answer: ['text'],
      question: ['text'],
      questionType: ['text'],
    },
  },
  'POST /api/interview/session/:sessionId/feedback': {
    params: {
      sessionId: ['sessionId'],
    },
  },
  'POST /api/interview/session/:sessionId/next-question': {
    params: {
      sessionId: ['sessionId'],
    },
  },
  'POST /api/interview/session/:sessionId/frame': {
    params: {
      sessionId: ['sessionId'],
    },
    body: {
      image: ['imageBase64'],
    },
  },
  'POST /api/interview/session/:sessionId/audio': {
    params: {
      sessionId: ['sessionId'],
    },
    body: {
      audio: ['audioBase64'],
    },
  },
  'GET /api/interview/session/:sessionId/analytics': {
    params: {
      sessionId: ['sessionId'],
    },
  },
  'GET /api/interview/questions': {
    query: {
      role: ['role'],
    },
  },
  'POST /api/interview/transcribe': {
    body: {
      audio: ['audioBase64'],
    },
  },
  'POST /api/resume/upload': {
    body: {
      resumeText: ['text'],
    },
  },
  'POST /api/resume/match': {
    body: {
      resumeText: ['text'],
      role: ['role'],
    },
  },
  'POST /api/resume/emotion': {
    body: {
      image: ['imageBase64'],
    },
  },
};

function getRouteKey(method, originalUrl) {
  const url = originalUrl.split('?')[0];
  const routeEntries = Object.keys(rules).filter((k) => k.startsWith(method));
  for (const key of routeEntries) {
    const pattern = key.split(' ')[1];
    const regex = new RegExp(
      '^' + pattern.replace(/:\w+/g, '([^/]+)') + '$'
    );
    if (regex.test(url)) return key;
  }
  return null;
}

function validate(method, originalUrl) {
  const routeKey = getRouteKey(method, originalUrl);
  if (!routeKey) return (req, res, next) => next();

  const routeRules = rules[routeKey];
  return (req, res, next) => {
    const errors = [];
    const sections = ['params', 'query', 'body'];
    for (const section of sections) {
      const sectionRules = routeRules[section];
      if (!sectionRules) continue;
      for (const [field, checks] of Object.entries(sectionRules)) {
        const value = req[section]?.[field];
        for (const check of checks) {
          const isValid = validators[check](value);
          if (!isValid) {
            errors.push({
              field: `${section}.${field}`,
              value: value === undefined ? 'undefined' : String(value).substring(0, 100),
              reason: `Failed ${check} validation`,
            });
            break;
          }
        }
      }
    }
    if (errors.length > 0) {
      return next(new AppError('Validation failed', 'VALIDATION_ERROR', 400, errors));
    }
    next();
  };
}

module.exports = { validate, validators, rules };
