import jwt from 'jsonwebtoken';
import { db } from '../lib/supabase.js';

export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Fail fast at startup — never start with an insecure JWT signing secret.
  // Set JWT_SECRET in your .env file (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  throw new Error('JWT_SECRET environment variable is required.');
}

/**
 * Extracts Bearer token strictly from Authorization header
 */
export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
};

/**
 * Middleware: Requires valid authenticated user
 */
export const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'يجب تسجيل الدخول أولاً للوصول إلى هذا المورد',
        code: 'UNAUTHORIZED'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'جلسة تسجيل الدخول غير صالحة',
        code: 'INVALID_TOKEN'
      });
    }

    const user = await db.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'المستخدم صاحب الحساب لم يعد موجوداً',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'انتهت صلاحية جلسة تسجيل الدخول، يرجى إعادة تسجيل الدخول',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'رمز التحقق غير صالح أو معطوب',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware: Requires authenticated user with 'admin' role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'يجب تسجيل الدخول أولاً',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'هذا الإجراء مخصص للمشرفين والمسؤولين فقط',
      code: 'FORBIDDEN'
    });
  }

  next();
};

/**
 * Helper: Extracts decoded user payload if valid token is provided, without rejecting if absent
 */
export const getOptionalUser = (req) => {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
};
