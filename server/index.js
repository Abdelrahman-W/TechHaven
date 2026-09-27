import os from 'os';
import cluster from 'cluster';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { requestIdMiddleware, structuredLoggingMiddleware } from './middleware/logger.js';
import { cspMiddleware, cspReportHandler } from './middleware/csp.js';
import 'dotenv/config';

import { rateLimiter, authLimiter, adminLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import inventoryRoutes from './routes/inventory.js';
import categoriesRoutes from './routes/categories.js';
import supplierRoutes from './routes/suppliers.js';
import purchasingRoutes from './routes/purchasing.js';
import orderRoutes from './routes/orders.js';
import cartRoutes from './routes/cart.js';
import b2bRoutes from './routes/b2b.js';
import pcBuilderRoutes from './routes/pc-builder.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes from './routes/payments.js';
import analyticsRoutes from './routes/analytics.js';
import reviewsRoutes from './routes/reviews.js';
import wishlistRoutes from './routes/wishlist.js';
import settingsRoutes from './routes/settings.js';
import seoRoutes from './routes/seo.js';
import { setupPrimaryCacheIPC } from './middleware/cache.js';

// ── P1-02: Local-fallback topology enforcement ─────────────────
// Supabase-configured production → full CPU cluster.
// Local JSON fallback            → exactly 1 worker.
// Detection mirrors server/lib/supabase.js (lines 7-8, 23).
const _supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const isSupabaseConfigured = !!_supabaseUrl && !!_supabaseKey;

const numCPUs = isSupabaseConfigured ? os.cpus().length : 1;

if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`Primary ${process.pid} is running`);
  
  // Set up cluster IPC cache invalidation broadcast
  setupPrimaryCacheIPC(cluster);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  const restartCounts = new Map();
  const MAX_RESTARTS = 5;
  const RESTART_WINDOW = 60000; // 1 minute

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Checking restart policy...`);
    const now = Date.now();
    const restarts = restartCounts.get('global') || [];
    // Clean old restarts outside window
    const recent = restarts.filter(t => now - t < RESTART_WINDOW);
    if (recent.length >= MAX_RESTARTS) {
      console.error(`Too many worker restarts (${MAX_RESTARTS} in ${RESTART_WINDOW/1000}s). Stopping restarts.`);
      return;
    }
    recent.push(now);
    restartCounts.set('global', recent);
    // Delay restart by 1 second
    setTimeout(() => {
      console.log('Restarting worker...');
      cluster.fork();
    }, 1000);
  });
} else {
  const app = express();
  const PORT = process.env.PORT || 4000;

  // ── Trust Proxy (Railway / Reverse Proxy Single Hop) ──────
  app.set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.use(structuredLoggingMiddleware);

  // ── Security & Middleware ──────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
  }));
  app.use(cspMiddleware);
  // ── CORS Allowlist ──────────────────────────────────────
  function parseCORSOrigins() {
    const raw = process.env.CORS_ORIGINS;
    if (raw) {
      return raw.split(',').map(o => o.trim().replace(/\/$/, ''));
    }
    // Development: default localhost origins
    if (process.env.NODE_ENV !== 'production') {
      return ['http://localhost:5173', 'http://127.0.0.1:5173'];
    }
    // Production: warn and deny all cross-origin requests
    console.error('');
    console.error('══════════════════════════════════════════════════════════');
    console.error('  [CORS] PRODUCTION WARNING: CORS_ORIGINS is not set.');
    console.error('  Cross-origin requests will be DENIED.');
    console.error('  Set CORS_ORIGINS to your frontend domain(s):');
    console.error('  e.g.: CORS_ORIGINS=https://your-frontend.vercel.app');
    console.error('══════════════════════════════════════════════════════════');
    console.error('');
    return [];
  }

  const corsAllowedOrigins = parseCORSOrigins();

  app.use(cors({
    origin: (origin, callback) => {
      // No Origin header → same-origin or server-to-server; allow.
      if (origin === undefined) return callback(null, true);
      // Origin: null (file:// or sandboxed iframe) → deny.
      if (origin === 'null') return callback(new Error('Not allowed by CORS'));
      // Exact origin match against the allowlist.
      if (corsAllowedOrigins.includes(origin)) return callback(null, true);
      // Disallowed origin.
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'X-Cache'],
  }));
  app.use(compression()); // Gzip compression
  app.use(express.json({ type: ['application/json', 'application/csp-report'], limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── CSP Violation Reporting Endpoint ────────────────────────
  app.post('/api/security/csp-reports', cspReportHandler);

  // ── Performance & Health Monitoring Endpoints (Exempt from Rate Limiting) ──
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      pid: process.pid,
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'techhaven-api',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      time: new Date().toISOString(),
    });
  });

  // ── Rate Limiting ──────────────────────────────────────────
  app.use('/api', rateLimiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/admin', adminLimiter);

  // ── Routes ────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/purchasing', purchasingRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/cart', cartRoutes);

    app.use('/api/b2b', b2bRoutes);
  app.use('/api/pc-builder', pcBuilderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/settings', settingsRoutes);
  
  // ── SEO & Public Crawlers (robots.txt, sitemap.xml) ────────
  app.use('/', seoRoutes);
  

  // ── 404 Handler ────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'الصفحة غير موجودة', code: 'NOT_FOUND' });
  });

  // ── Error Handler ──────────────────────────────────────────
  app.use(errorHandler);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ TechHaven API → http://0.0.0.0:${PORT} (Worker: ${process.pid})`);
  });

  // ── Graceful Shutdown ─────────────────────────────────────
  const gracefulShutdown = () => {
    console.log('Received kill signal, shutting down gracefully.');
    server.close(() => {
      console.log('Closed out remaining connections.');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  
  // In case default export is expected
  // In ES module with cluster we export default conditionally or just server
  // Actually we need to export default for testing or entry point
}

// To satisfy export default server if some script imports it:
export default {};
