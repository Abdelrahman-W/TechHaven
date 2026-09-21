import { Router } from 'express';
import { db } from '../lib/supabase.js';

const router = Router();

function getBaseUrl(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, '');
  }
  if (process.env.VITE_SITE_URL) {
    return process.env.VITE_SITE_URL.replace(/\/+$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'techhaven.eg';
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

// ── GET /robots.txt ──────────────────────────────────────────
router.get('/robots.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    'Allow: /shop',
    'Allow: /product/',
    'Allow: /pc-builder',
    'Allow: /b2b',
    'Allow: /compare',
    '',
    '# Disallow private, administrative, and checkout endpoints',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /profile',
    'Disallow: /orders',
    'Disallow: /wishlist',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
  res.status(200).send(robotsTxt);
});

// ── GET /sitemap.xml ─────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  let products = [];
  try {
    const productsRes = await db.getAllProducts();
    products = Array.isArray(productsRes) ? productsRes : (productsRes?.data || []);
  } catch {
    products = [];
  }

  const staticUrls = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/shop', priority: '0.9', changefreq: 'daily' },
    { path: '/pc-builder', priority: '0.8', changefreq: 'weekly' },
    { path: '/b2b', priority: '0.7', changefreq: 'monthly' },
    { path: '/compare', priority: '0.6', changefreq: 'weekly' },
  ];

  const xmlEntries = [];

  for (const item of staticUrls) {
    xmlEntries.push(`  <url>
    <loc>${baseUrl}${item.path}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`);
  }

  for (const prod of products) {
    if (prod && (prod.id || prod.slug)) {
      const prodPath = `/product/${encodeURIComponent(prod.id || prod.slug)}`;
      xmlEntries.push(`  <url>
    <loc>${baseUrl}${prodPath}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
  res.status(200).send(sitemapXml);
});

export default router;
