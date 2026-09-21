import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// Helper to get userId from JWT token if present, otherwise session/anonymous
const getUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded.userId || decoded.id;
    } catch {
      // invalid token, fallback to session
    }
  }
  return req.headers['x-session-id'] || 'guest-session';
};

// GET /api/cart
router.get('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const cart = await db.getCart(userId);
    res.json({ data: cart });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart
router.post('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { product_id, quantity = 1, custom_specs } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await db.getProduct(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const itemImage = product.thumbnail || (Array.isArray(product.images) && product.images[0]) || '/images/prod-headphones.jpg';

    const item = {
      id: uuidv4(),
      product_id: product.id,
      name: product.name,
      name_en: product.name_en,
      brand: product.brand,
      price: product.price,
      unit_price: product.price,
      old_price: product.old_price,
      thumbnail: itemImage,
      image: itemImage,
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [itemImage],
      quantity: Math.max(1, Number(quantity)),
      product: {
        id: product.id,
        name: product.name,
        name_en: product.name_en,
        brand: product.brand,
        price: product.price,
        unit_price: product.price,
        old_price: product.old_price,
        thumbnail: itemImage,
        image: itemImage,
        images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [itemImage],
        stock_qty: product.stock_qty,
        badge: product.badge,
        badge_color: product.badge_color,
      },
      custom_specs: custom_specs || null,
      created_at: new Date().toISOString()
    };

    const cart = await db.upsertCartItem(userId, item);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/:productId
router.put('/:productId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { quantity } = req.body;

    if (quantity <= 0) {
      const cart = await db.removeCartItem(userId, req.params.productId);
      return res.json({ success: true, data: cart });
    }

    const cart = await db.updateCartItem(userId, req.params.productId, { quantity });
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/:productId
router.delete('/:productId', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const cart = await db.removeCartItem(userId, req.params.productId);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart (clear cart)
router.delete('/', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    await db.clearCart(userId);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
});

export default router;
