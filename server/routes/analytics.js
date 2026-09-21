import { Router } from 'express';
import { db } from '../lib/supabase.js';
import { requireAuth } from './auth.js';

const router = Router();

// Middleware to check for admin role
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'غير مصرح لك بالوصول', code: 'FORBIDDEN' });
  }
};

// Apply auth and admin middleware to all routes in this file
router.use(requireAuth, requireAdmin);

// ── GET /api/analytics/overview ────────────────────────
router.get('/overview', async (req, res, next) => {
  try {
    const [products, orders, users] = await Promise.all([
      db.getAllProducts(),
      db.getOrders ? db.getOrders() : Promise.resolve([]),
      db.getAllUsers()
    ]);
    
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    res.json({
      data: {
        totalRevenue,
        totalOrders: orders.length,
        totalUsers: users.length,
        totalProducts: products.length
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/analytics/revenue ──────────────────────────
router.get('/revenue', async (req, res, next) => {
  try {
    const { period = '7d' } = req.query; // 7d, 30d, 90d
    let days = 7;
    if (period === '30d') days = 30;
    if (period === '90d') days = 90;
    
    const orders = await (db.getOrders ? db.getOrders() : Promise.resolve([]));
    
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const recentOrders = orders.filter(o => new Date(o.created_at) >= cutoffDate);
    
    // Group by date
    const revenueByDate = {};
    for (const order of recentOrders) {
      const dateKey = new Date(order.created_at).toISOString().split('T')[0];
      if (!revenueByDate[dateKey]) {
        revenueByDate[dateKey] = 0;
      }
      revenueByDate[dateKey] += (order.total || 0);
    }
    
    const chartData = Object.keys(revenueByDate).sort().map(date => ({
      date,
      revenue: revenueByDate[date]
    }));
    
    res.json({ data: chartData });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/analytics/top-products ─────────────────────
router.get('/top-products', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const products = await db.getAllProducts();
    const topProducts = products
      .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
      .slice(0, Number(limit))
      .map(p => ({
        id: p.id,
        name: p.name,
        sold_count: p.sold_count || 0,
        price: p.price
      }));
      
    res.json({ data: topProducts });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/analytics/recent-orders ────────────────────
router.get('/recent-orders', async (req, res, next) => {
  try {
    const { limit = 5 } = req.query;
    const orders = await (db.getOrders ? db.getOrders() : Promise.resolve([]));
    const recent = orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, Number(limit));
      
    res.json({ data: recent });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/analytics/user-stats ───────────────────────
router.get('/user-stats', async (req, res, next) => {
  try {
    const users = await db.getAllUsers();
    
    const adminCount = users.filter(u => u.role === 'admin').length;
    const customerCount = users.length - adminCount;
    
    res.json({
      data: {
        totalUsers: users.length,
        roles: {
          admin: adminCount,
          customer: customerCount
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
