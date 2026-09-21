/* eslint-disable no-unused-vars */
export function errorHandler(err, req, res, _next) {
  const requestId = req?.id || req?.requestId || 'unknown';

  const errorLog = {
    timestamp: new Date().toISOString(),
    level: 'error',
    requestId,
    name: err.name || 'Error',
    message: err.message,
    code: err.code || 'INTERNAL_ERROR',
    status: err.status || 500,
    path: req?.originalUrl || req?.url,
    method: req?.method,
  };

  if (process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json') {
    console.error(JSON.stringify(errorLog));
  } else {
    console.error(`❌ [${requestId}] Server Error:`, err);
  }

  // Ensure response includes X-Request-Id header
  if (requestId && !res.headersSent) {
    res.setHeader('X-Request-Id', requestId);
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'بيانات غير صحيحة',
      fields: err.errors,
      code: 'VALIDATION_ERROR',
      requestId,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'رمز الدخول (token) غير صحيح',
      code: 'INVALID_TOKEN',
      requestId,
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
      code: 'TOKEN_EXPIRED',
      requestId,
    });
  }

  // Supabase / DB errors
  if (err.code && err.message) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message,
      code: err.code || 'DB_ERROR',
      requestId,
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'حدث خطأ في معالجة طلبك، يرجى المحاولة لاحقاً' : err.message,
    code: 'INTERNAL_ERROR',
    requestId,
  });
}
