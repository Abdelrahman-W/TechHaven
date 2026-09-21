/**
 * Content Security Policy (CSP) Middleware for TechHaven
 * Implements strict, defense-in-depth CSP controls for Production and Development.
 */

export function getCSPDirectives(isProduction = process.env.NODE_ENV === 'production') {
  const directives = {
    'default-src': ["'self'"],
    'script-src': isProduction 
      ? ["'self'"] 
      : ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://images.unsplash.com',
      'https://placehold.co',
      'https://via.placeholder.com',
      'https://*.supabase.co',
      'https://*.supabase.in',
    ],
    'connect-src': isProduction
      ? ["'self'", 'https://*.railway.app', 'https://api.techhaven.eg']
      : ["'self'", 'ws://localhost:5173', 'ws://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    'frame-src': ["'self'", 'https://accept.paymob.com'],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'manifest-src': ["'self'"],
  };

  if (isProduction) {
    directives['upgrade-insecure-requests'] = [];
  }

  return directives;
}

export function buildCSPHeaderString(directives) {
  return Object.entries(directives)
    .map(([key, values]) => {
      if (!values || values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

export const cspMiddleware = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isReportOnly = process.env.CSP_REPORT_ONLY === 'true';
  const directives = getCSPDirectives(isProduction);
  const cspHeader = buildCSPHeaderString(directives);

  const headerName = isReportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  res.setHeader(headerName, cspHeader);
  next();
};

export const cspReportHandler = (req, res) => {
  const report = req.body;
  if (process.env.NODE_ENV !== 'production' || process.env.CSP_LOG_VIOLATIONS === 'true') {
    console.warn('[CSP Violation Report]:', JSON.stringify(report));
  }
  res.status(204).end();
};
