import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { JWT_SECRET, requireAuth } from '../middleware/auth.js';
export { requireAuth };

const router = Router();

// Zod schemas
const registerSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف'),
  full_name: z.string().min(2, 'الاسم يجب أن لا يقل عن حرفين'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

// ── POST /api/auth/register ─────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = registerSchema.parse(req.body);

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'البريد الإلكتروني مسجل مسبقاً',
        code: 'EMAIL_EXISTS'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name,
      phone: phone || '',
      role: 'user',
      created_at: new Date().toISOString()
    };

    const user = await db.createUser(newUser);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role
        },
        token
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: err.errors[0]?.message || 'بيانات غير صحيحة',
        code: 'VALIDATION_ERROR'
      });
    }
    next(err);
  }
});

// ── POST /api/auth/login ────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        code: 'INVALID_CREDENTIALS'
      });
    }

    await db.updateUser(user.id, { last_login: new Date().toISOString() });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role: user.role
        },
        token
      }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: err.errors[0]?.message || 'بيانات غير صحيحة',
        code: 'VALIDATION_ERROR'
      });
    }
    next(err);
  }
});

// ── GET /api/auth/me ────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.full_name,
        phone: req.user.phone,
        role: req.user.role,
        created_at: req.user.created_at
      }
    }
  });
});

// ── PUT /api/auth/profile ───────────────────────────────
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const { full_name, name, phone, city, address } = req.body;
    const safeUpdates = {};
    if (full_name || name) safeUpdates.full_name = (full_name || name).trim();
    if (phone !== undefined) safeUpdates.phone = phone.trim();
    if (city !== undefined) safeUpdates.city = city.trim();
    if (address !== undefined) safeUpdates.address = address.trim();

    const updated = await db.updateUser(req.user.id, safeUpdates);
    res.json({
      data: {
        user: {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
          phone: updated.phone,
          city: updated.city,
          address: updated.address,
          role: updated.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
