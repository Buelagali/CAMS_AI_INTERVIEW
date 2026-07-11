const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const transcribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Transcription rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many sessions created, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, transcribeLimiter, sessionLimiter };
