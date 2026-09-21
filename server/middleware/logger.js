import crypto from 'crypto';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'cookie',
  'secret',
  'api_key',
  'apikey',
  'card_number',
  'cvv',
  'cvc',
  'pin',
  'service_role_key',
  'anon_key',
  'hmac_secret',
]);

/**
 * Validates inbound X-Request-Id. Must be alphanumeric with dashes/underscores, 8-64 chars.
 */
export function isValidRequestId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id.trim());
}

/**
 * Generates a standard cryptographically random UUID v4.
 */
export function generateRequestId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Deep redaction of sensitive fields from objects (headers, queries, bodies).
 */
export function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('auth')) {
      clean[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      clean[key] = redactSensitiveData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Request Correlation ID Middleware
 */
export function requestIdMiddleware(req, res, next) {
  const inboundId = req.headers['x-request-id'];
  let requestId;

  if (inboundId && isValidRequestId(inboundId)) {
    requestId = inboundId.trim();
  } else {
    requestId = generateRequestId();
  }

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/**
 * Structured Logging Middleware
 */
export function structuredLoggingMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();
  const startTime = new Date().toISOString();

  res.on('finish', () => {
    // Skip logging internal healthchecks in production to reduce noise unless error
    if (req.path === '/api/health' && res.statusCode === 200 && process.env.NODE_ENV === 'production') {
      return;
    }

    const durationNs = process.hrtime.bigint() - startNs;
    const durationMs = Number(durationNs) / 1e6;

    const logEntry = {
      timestamp: startTime,
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      requestId: req.id || req.requestId || 'unknown',
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip || req.socket?.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    if (process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json') {
      const output = JSON.stringify(logEntry);
      if (res.statusCode >= 500) {
        console.error(output);
      } else if (res.statusCode >= 400) {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const statusColor = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '⚡';
      console.log(`${statusColor} [${logEntry.requestId.slice(0, 8)}] ${req.method} ${logEntry.path} -> ${res.statusCode} (${logEntry.durationMs}ms)`);
    }
  });

  next();
}
