const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, code, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
  }
}

const errorCodes = {
  VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  FORBIDDEN: { status: 403, message: 'Access denied' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
  ASR_ERROR: { status: 503, message: 'Speech recognition unavailable' },
  MODEL_ERROR: { status: 503, message: 'AI model unavailable' },
  SESSION_ERROR: { status: 400, message: 'Session error' },
  INVALID_INPUT: { status: 400, message: 'Invalid input' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
  STORE_ERROR: { status: 503, message: 'Storage unavailable' },
  PROMPT_INJECTION: { status: 400, message: 'Prompt injection detected' },
  UNSAFE_OUTPUT: { status: 422, message: 'Model generated unsafe output' },
  TOKEN_EXPIRED: { status: 401, message: 'Token expired' },
  FILE_TOO_LARGE: { status: 413, message: 'File too large' },
  UNSUPPORTED_TYPE: { status: 415, message: 'Unsupported media type' },
};

function errorMiddleware(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || `req_${Date.now()}`;
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';

  const errorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    requestId,
  };

  if (err.details) {
    errorResponse.details = err.details;
  }
  if (err.stack && process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack.split('\n').slice(0, 5).join('\n');
  }

  logger.error('api', `Error ${code}: ${message}`, {
    requestId,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(statusCode).json(errorResponse);
}

function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 'NOT_FOUND', 404));
}

module.exports = { AppError, errorCodes, errorMiddleware, notFoundHandler };
