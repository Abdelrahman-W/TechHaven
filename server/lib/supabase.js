import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase not configured — using local in-memory/fallback database with disk persistence');
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseKey || 'anon-key-placeholder',
  {
    auth: { persistSession: false },
    db: { schema: 'public' },
  }
);

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

// ── Local Fallback Database & State ──────────────────────────────
const localStore = new Map();
const DB_FILE = path.resolve(process.cwd(), 'server/data/store.json');

/**
 * SERIALIZED + ATOMIC local persistence (P0-1 fix).
 *
 * Safety model:
 * 1. SERIALIZED — a single promise chain guarantees only ONE write is ever
 *    in flight; concurrent save requests are queued and applied in order.
 *    Each queued write snapshots the CURRENT localStore state, so a burst of
 *    mutations always converges to the latest state on disk.
 * 2. ATOMIC — the snapshot is written to a temp file in the SAME directory,
 *    flushed to disk (fsync), then atomically renamed over store.json.
 *    A crash mid-write can never leave partially-written JSON as the
 *    canonical store; the previous valid file stays in place.
 * 3. FAILURE-SAFE — if any step fails, the temp file is cleaned up, the
 *    existing store.json remains untouched, and the error is logged.
 */
let storeWriteQueue = Promise.resolve();

// Cross-process write lock: with Node cluster (production) multiple workers
// write the same store.json. The rename() atomic-swap can fail with ENOENT
// when two processes race — one renames the tmp file away while the other
// tries to rename its own. The lock file (.store.lock, created with 'wx')
// serializes writers across processes so only one rename happens at a time.
const LOCK_FILE = path.join(path.dirname(DB_FILE), '.store.lock');
let storeLockCounter = 0; // process-local guard against self-deadlock

async function acquireStoreLock(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    storeLockCounter++;
    if (storeLockCounter === 1) {
      // First lock in THIS process: no need for the file — the in-process
      // queue already serializes. (Counter mirrors the queue depth.)
    }
    try {
      // 'wx' fails if the file exists → another process holds the lock.
      const fh = await fs.promises.open(LOCK_FILE, 'wx');
      await fh.close();
      return true;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // Stale lock? If older than 5s, steal it (crash recovery).
      try {
        const st = await fs.promises.stat(LOCK_FILE);
        if (Date.now() - st.mtimeMs > 5000) {
          await fs.promises.unlink(LOCK_FILE);
          continue;
        }
      } catch { /* stat failed → lock vanished, retry */ }
      await new Promise(r => setTimeout(r, 25 + Math.random() * 50));
    }
  }
  throw new Error('Timed out acquiring store lock');
}

async function releaseStoreLock() {
  storeLockCounter = Math.max(0, storeLockCounter - 1);
  try { await fs.promises.unlink(LOCK_FILE); } catch { /* already gone */ }
}

export function saveStoreToDisk() {
  if (isSupabaseConfigured) return Promise.resolve();
  // Snapshot the store state NOW (at call time), then queue the write.
  // Serializing at enqueue time means every queued write carries the
  // latest complete state — writes can interleave logically but never
  // physically overlap, and the final write always wins.
  const snapshot = {};
  for (const [k, v] of localStore.entries()) {
    snapshot[k] = v;
  }
  const payload = JSON.stringify(snapshot, null, 2);

  const performWrite = async () => {
    const dir = path.dirname(DB_FILE);
    const tmpFile = path.join(dir, `.${path.basename(DB_FILE)}.tmp`);
    let handle = null;
    try {
      // Serialize with OTHER PROCESSES before touching the tmp file — the
      // rename() below must never race another process's rename().
      await acquireStoreLock();
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Write the complete payload to a temp file in the SAME directory
      // (same filesystem → rename is atomic on POSIX and Windows).
      handle = await fs.promises.open(tmpFile, 'w');
      await handle.writeFile(payload, 'utf-8');
      await handle.sync(); // flush to disk before replacing the canonical file
      await handle.close();
      handle = null;
      // Atomic replacement: previous valid store.json is only overwritten
      // once the new complete file is fully written and synced.
      await fs.promises.rename(tmpFile, DB_FILE);
      await releaseStoreLock();
    } catch (err) {
      console.error('Failed to save store to disk:', err);
      try { await releaseStoreLock(); } catch { /* already released */ }
      if (handle) {
        try { await handle.close(); } catch { /* already closed */ }
      }
      // Never leave a stale/partial temp file behind; the existing
      // store.json is untouched and remains the last valid state.
      try { await fs.promises.unlink(tmpFile); } catch { /* nothing to clean */ }
    }
  };

  storeWriteQueue = storeWriteQueue.then(performWrite, performWrite);
  return storeWriteQueue;
}

export function loadStoreFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const obj = JSON.parse(content);
      for (const [k, v] of Object.entries(obj)) {
        localStore.set(k, v);
      }
      return true;
    }
  } catch (err) {
    console.error('Failed to load store from disk:', err);
    console.error(`⚠️ store.json is corrupted or unreadable — it will NOT be overwritten.`);
    console.error(`⚠️ Keeping the corrupted file in place for manual recovery: ${DB_FILE}`);
  }
  return false;
}

// Seed Categories (Exact 8 Categories from TechHaven Reference Design)
export const SEED_CATEGORIES = [
  { id: 'cat-headphones', slug: 'headphones', name: 'سماعات الرأس', name_en: 'Headphones', icon: '🎧', description: 'سماعات رأس لاسلكية احترافية مع إلغاء نشط للضوضاء وصوت استثنائي', sort_order: 1, is_active: true },
  { id: 'cat-smartwatches', slug: 'smartwatches', name: 'ساعات ذكية', name_en: 'Smart Watches', icon: '⌚', description: 'ساعات ذكية فائقة لتتبع الصحة واللياقة والاتصال الدائم', sort_order: 2, is_active: true },
  { id: 'cat-smartphones', slug: 'smartphones', name: 'هواتف ذكية', name_en: 'Smartphones', icon: '📱', description: 'أحدث الهواتف الذكية الرائدة بأقوى المعالجات وأحدث الكاميرات', sort_order: 3, is_active: true },
  { id: 'cat-laptops', slug: 'laptops', name: 'أجهزة لابتوب', name_en: 'Laptops', icon: '💻', description: 'أجهزة لابتوب فائقة النحافة والقوة للمحترفين وصناع المحتوى', sort_order: 4, is_active: true },
  { id: 'cat-cameras', slug: 'cameras', name: 'كاميرات احترافية', name_en: 'Cameras', icon: '📷', description: 'كاميرات بدون مرآة متطورة للتصوير الفوتوغرافي والفيديو السينمائي', sort_order: 5, is_active: true },
  { id: 'cat-speakers', slug: 'speakers', name: 'مكبرات صوت', name_en: 'Speakers', icon: '🔊', description: 'مكبرات صوت محيطية بزاوية 360 درجة مع صوت نقي وبيز عميق', sort_order: 6, is_active: true },
  { id: 'cat-gaming', slug: 'gaming', name: 'ألعاب وكونسول', name_en: 'Gaming', icon: '🎮', description: 'إكسسوارات ووحدات تحكم احترافية للألعاب التنافسية', sort_order: 7, is_active: true },
  { id: 'cat-drones', slug: 'drones', name: 'طائرات درونز', name_en: 'Drones', icon: '🚁', description: 'طائرات بدون طيار ذكية بكاميرات 4K وتثبيت جيمبال ثلاثي المحاور', sort_order: 8, is_active: true },
];

// ── RBAC Seed Permissions & Roles (Batch 01) ──────────────────────
export const SEED_PERMISSIONS = [
  { code: 'products.view', resource: 'products', action: 'view', name: 'عرض المنتجات', description: 'الاطلاع على تفاصيل المنتجات والكتالوج والمخزون' },
  { code: 'products.create', resource: 'products', action: 'create', name: 'إضافة منتج', description: 'إنشاء وإضافة منتجات جديدة في المتجر' },
  { code: 'products.edit', resource: 'products', action: 'edit', name: 'تعديل المنتجات', description: 'تعديل بيانات المنتجات والأسعار والمواصفات' },
  { code: 'products.delete', resource: 'products', action: 'delete', name: 'حذف المنتجات', description: 'حذف المنتجات نهائياً من الكتالوج' },

  { code: 'categories.view', resource: 'categories', action: 'view', name: 'عرض الأقسام', description: 'الاطلاع على الأقسام والفئات' },
  { code: 'categories.create', resource: 'categories', action: 'create', name: 'إضافة قسم', description: 'إنشاء أقسام وتصنيفات جديدة' },
  { code: 'categories.edit', resource: 'categories', action: 'edit', name: 'تعديل الأقسام', description: 'تعديل أسماء وأيقونات الأقسام وترتيبها' },
  { code: 'categories.delete', resource: 'categories', action: 'delete', name: 'حذف الأقسام', description: 'حذف التصنيفات والأقسام' },

  { code: 'orders.view', resource: 'orders', action: 'view', name: 'عرض الطلبات', description: 'استعراض طلبات العملاء وتفاصيل الفواتير' },
  { code: 'orders.edit', resource: 'orders', action: 'edit', name: 'تعديل الطلبات', description: 'تحديث حالة الشحن والطلب والملاحظات الداخلية' },
  { code: 'orders.cancel', resource: 'orders', action: 'cancel', name: 'إلغاء الطلبات', description: 'إلغاء طلبات الشراء' },
  { code: 'orders.export', resource: 'orders', action: 'export', name: 'تصدير كشوف الشحن', description: 'تصدير بيانات الشحنات والمانيفست لشركات الشحن (CSV)' },

  { code: 'inventory.view', resource: 'inventory', action: 'view', name: 'عرض المخزون', description: 'الاطلاع على كميات المخزون وتنبيهات النواقص' },
  { code: 'inventory.adjust', resource: 'inventory', action: 'adjust', name: 'تعديل المخزون السريع', description: 'تعديل وتحديث أرصدة المخزون بالمستودع' },
  { code: 'inventory.movements', resource: 'inventory', action: 'movements', name: 'سجل حركة المخزون', description: 'استعراض سجل حركات الوارد والمنصرف والتالف' },

  { code: 'purchasing.view', resource: 'purchasing', action: 'view', name: 'عرض المشتريات والموردين', description: 'الاطلاع على قائمة الموردين وأوامر الشراء' },
  { code: 'purchasing.create', resource: 'purchasing', action: 'create', name: 'إنشاء أوامر شراء', description: 'إنشاء أوامر شراء جديدة وتوجيهها للموردين' },
  { code: 'purchasing.receive', resource: 'purchasing', action: 'receive', name: 'استلام بضائع المشتريات', description: 'تسجيل استلام البضائع وزيادة رصيد المستودع' },

  { code: 'reports.sales', resource: 'reports', action: 'sales', name: 'تقارير المبيعات', description: 'استعراض إحصائيات المبيعات وحجم الطلبات اليومي' },
  { code: 'reports.profit', resource: 'reports', action: 'profit', name: 'تقارير الأرباح وهوامش الربح', description: 'استعراض تكلفة البضاعة المباعة COGS وصافي الأرباح' },
  { code: 'reports.inventory', resource: 'reports', action: 'inventory', name: 'تقارير حركة المخزون', description: 'استعراض معدل دوران المخزون والمنتجات الراكدة' },

  { code: 'b2b.view', resource: 'b2b', action: 'view', name: 'عرض طلبات الشركات', description: 'استعراض طلبات عروض أسعار الشركات والمؤسسات B2B' },
  { code: 'b2b.manage', resource: 'b2b', action: 'manage', name: 'إدارة طلبات الشركات', description: 'تحديث حالات عروض الأسعار والتواصل مع الشركات' },

  { code: 'reviews.view', resource: 'reviews', action: 'view', name: 'عرض التقييمات', description: 'استعراض تقييمات وتعليقات العملاء لكافة المنتجات' },
  { code: 'reviews.moderate', resource: 'reviews', action: 'moderate', name: 'إدارة وحذف التقييمات', description: 'حذف وإدارة الملاحظات غير اللائقة أو العشوائية' },

  { code: 'users.view', resource: 'users', action: 'view', name: 'عرض المستخدمين', description: 'الاطلاع على قائمة العملاء وفريق العمل' },
  { code: 'users.manage', resource: 'users', action: 'manage', name: 'إدارة المستخدمين', description: 'إنشاء وتعديل وحذف حسابات الموظفين والعملاء' },

  { code: 'permissions.view', resource: 'permissions', action: 'view', name: 'عرض الصلاحيات والأدوار', description: 'استعراض مصفوفة الصلاحيات والأدوار' },
  { code: 'permissions.manage', resource: 'permissions', action: 'manage', name: 'إدارة الصلاحيات والأدوار', description: 'تعديل وتعيين الأدوار والصلاحيات للمستخدمين' },

  { code: 'settings.view', resource: 'settings', action: 'view', name: 'عرض إعدادات النظام', description: 'الاطلاع على إعدادات المتجر وبيانات الاتصال' },
  { code: 'settings.manage', resource: 'settings', action: 'manage', name: 'تعديل إعدادات النظام', description: 'تعديل بوابات الدفع وسياسات الشحن والربط الخارجي' },
];

export const SEED_ROLES = [
  {
    id: 'role-owner',
    code: 'owner',
    name: 'المدير العام (Owner)',
    description: 'صلاحيات كاملة وغير مقيدة على كافة أقسام النظام والتقارير المالية وإدارة الصلاحيات',
    is_system: true,
    permissions: ['*'],
  },
  {
    id: 'role-store-manager',
    code: 'store_manager',
    name: 'مدير المتجر والعمليات (Store Manager)',
    description: 'إدارة العمليات اليومية: المنتجات، الطلبات، المخزون، الشركات، والتقارير التشغيلية',
    is_system: true,
    permissions: [
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
      'orders.view', 'orders.edit', 'orders.cancel', 'orders.export',
      'inventory.view', 'inventory.adjust', 'inventory.movements',
      'purchasing.view', 'purchasing.create', 'purchasing.receive',
      'b2b.view', 'b2b.manage',
      'reviews.view', 'reviews.moderate',
      'reports.sales', 'reports.inventory',
      'users.view',
      'settings.view',
    ],
  },
  {
    id: 'role-inventory-officer',
    code: 'inventory_officer',
    name: 'مسؤول المخازن (Inventory Officer)',
    description: 'إدارة المخزون، الجرد السريع، متابعة النواقص، واستلام أوامر الشراء',
    is_system: true,
    permissions: [
      'products.view',
      'inventory.view', 'inventory.adjust', 'inventory.movements',
      'purchasing.view', 'purchasing.receive',
      'reports.inventory',
    ],
  },
  {
    id: 'role-fulfillment-agent',
    code: 'fulfillment_agent',
    name: 'مسؤول الشحن والتجهيز (Fulfillment Agent)',
    description: 'متابعة الطلبات، تحديث حالات الشحن، وتصدير كشوف التوصيل لمندوبي الشحن',
    is_system: true,
    permissions: [
      'products.view',
      'orders.view', 'orders.edit', 'orders.export',
      'inventory.view',
    ],
  },
  {
    id: 'role-user',
    code: 'user',
    name: 'عميل (Customer)',
    description: 'حساب عميل عادي للتسوق والطلب ومتابعة المشتريات الشخصية',
    is_system: true,
    permissions: [],
  },
];

export const SEED_SUPPLIERS = [
  {
    id: 'sup-cairo-tech',
    name: 'Cairo Tech Distribution (التقنية لتوزيع الهاردوير)',
    contact_name: 'Eng. Hany Mostafa',
    phone: '01012345678',
    email: 'hany@cairotech-eg.com',
    address: '15 El-Bostan St, Downtown, Cairo',
    tax_number: '100-234-567',
    notes: 'Primary GPU & Motherboard distributor (ASUS, MSI)',
    is_active: true,
    created_at: '2026-01-10T10:00:00.000Z',
    updated_at: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'sup-delta-micro',
    name: 'Delta Micro Computers (دلتا مايكرو)',
    contact_name: 'Mohamed Tarek',
    phone: '01223456789',
    email: 'sales@deltamicro.com',
    address: 'Technology Mall, Nasr City, Cairo',
    tax_number: '200-345-678',
    notes: 'Authorized Intel, AMD & Kingston storage distributor',
    is_active: true,
    created_at: '2026-01-15T11:00:00.000Z',
    updated_at: '2026-01-15T11:00:00.000Z',
  }
];

// Seed Products (Exact Flagship Products from TechHaven Reference Design + Category Champions)
export const SEED_PRODUCTS = [
  {
    id: 'prod-headphones',
    sku: 'TH-STUDIO-PRO',
    name: 'TechHaven Studio Pro Wireless ANC Headphones',
    name_en: 'TechHaven Studio Pro Wireless ANC Headphones',
    slug: 'techhaven-studio-pro-wireless',
    category_id: 'cat-headphones',
    brand: 'TechHaven',
    model: 'Studio Pro Wireless Gen 1',
    price: 9800,
    old_price: 11500,
    cost_price: 7400,
    stock_qty: 35,
    images: ['/images/prod-headphones.jpg', '/images/hero-1.jpg'],
    thumbnail: '/images/prod-headphones.jpg',
    description: 'سماعات رأس لاسلكية احترافية فوق الأذن من TechHaven مع إلغاء نشط هجين للضوضاء (Hybrid ANC)، صوت مكاني سينمائي مع تتبع ديناميكي لحركات الرأس، وسائد جلدية فاخرة، وبطارية خارقة تدوم حتى 40 ساعة تشغيل متواصل.',
    description_en: 'Flagship wireless over-ear headphones with hybrid active noise cancellation, custom acoustic drivers, spatial audio, and 40-hour battery life.',
    specs: {
      'نوع الاتصال': 'Bluetooth 5.3 + AUX 3.5mm سلكي فائق النقاء',
      'عمر البطارية': 'حتى 40 ساعة استماع مع تشغيل ANC (50 ساعة بدون ANC)',
      'إلغاء الضوضاء': 'Hybrid Active Noise Cancellation بتقنية 4 ميكروفونات',
      'المحركات الصوتية': 'Dynamic Neodymium Drivers مقاس 40 مم مضبوطة احترافياً',
      'الشحن السريع': 'شحن سريع عبر USB-C: 10 دقائق تمنح 5 ساعات استماع',
      'الوزن والخامات': '248 جرام مع هيكل ألومنيوم ووسائد ميموري فوم مريحة للارتداء الطويل',
      'الميكروفونات': 'ميكروفون مزدوج مع عزل ضجيج المكالمات بالذكاء الاصطناعي AI ENC'
    },
    features: ['عزل نشط هجين للضوضاء يعزل 99.2% من الضجيج المحيط', 'صوت مكاني سينمائي 360 درجة مع معالجة رقمية متطورة', 'وسائد أذن ميموري فوم ناعمة توفر راحة فائقة', 'توافق فوري مع جميع الأجهزة عبر البلوتوث 5.3'],
    tags: ['Headphones', 'Studio Pro', 'TechHaven', 'Audio', 'ANC', 'Wireless'],
    badge: 'FLAGSHIP',
    badge_color: 'hot',
    rating: 4.95,
    review_count: 142,
    sold_count: 380,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'prod-airpods',
    sku: 'TH-AIRPODS-PRO2',
    name: 'TechHaven AirPods Pro 2',
    name_en: 'TechHaven AirPods Pro 2 Wireless Earbuds',
    slug: 'techhaven-airpods-pro-2',
    category_id: 'cat-headphones',
    brand: 'TechHaven',
    model: 'AirPods Pro Gen 2',
    price: 8499,
    old_price: 9999,
    cost_price: 6500,
    stock_qty: 28,
    images: ['/images/prod-airpods.jpg'],
    thumbnail: '/images/prod-airpods.jpg',
    description: 'سماعات أذن لاسلكية فائقة النقاء مع إلغاء نشط للضوضاء من الجيل الثاني، وضع شفافية متكيف، وصوت مكاني مخصص.',
    description_en: 'Next-gen wireless earbuds with 2x Active Noise Cancellation, adaptive transparency, and personalized spatial audio.',
    specs: {
      'نوع الاتصال': 'Bluetooth 5.3',
      'عمر البطارية': 'حتى 30 ساعة مع العلبة',
      'إلغاء الضوضاء': 'Active Noise Cancellation 2x',
      'مقاومة الماء والتعرق': 'معيار IP54',
      'منفذ الشحن': 'USB-C & MagSafe Wireless',
      'الوزن': '5.3 جرام لكل سماعة'
    },
    features: ['إلغاء ضوضاء نشط مضاعف', 'شريحة H2 فائقة الذكاء', 'صوت مكاني مخصص مع تتبع حركات الرأس', 'علبة شحن مزودة بسماعة مدمجة لتحديد المكان'],
    tags: ['AirPods', 'Headphones', 'TechHaven', 'Audio', 'Noise Cancelling'],
    badge: 'NEW',
    badge_color: 'hot',
    rating: 4.9,
    review_count: 128,
    sold_count: 310,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'prod-watch',
    sku: 'TH-WATCH-ULTRA',
    name: 'TH Watch Ultra Smartwatch',
    name_en: 'TH Watch Ultra Titanium Smartwatch',
    slug: 'th-watch-ultra',
    category_id: 'cat-smartwatches',
    brand: 'TechHaven',
    model: 'Watch Ultra Titanium 49mm',
    price: 14999,
    old_price: 16999,
    cost_price: 12000,
    stock_qty: 18,
    description: 'ساعة ذكية رائدة بهيكل من التيتانيوم خفيف الوزن، شاشة Retina OLED ساطعة، نظام تحديد المواقع ثنائي التردد، وتتبع متقدم للياقة والصحة.',
    description_en: 'Rugged titanium smartwatch with precision dual-frequency GPS, up to 36h battery life, and advanced health metrics.',
    specs: {
      'مقاس الهيكل': 'Titanium 49mm',
      'نوع الشاشة': 'Always-On Retina OLED 2000 nits',
      'عمر البطارية': 'حتى 36 ساعة استخدام عادي / 72 ساعة وضع توفير الطاقة',
      'مقاومة الماء والغوص': 'مقاومة حتى عمق 100 متر (WR100 / EN13319)',
      'المستشعرات': 'معدل نبضات القلب، تخطيط القلب ECG، قياس الأكسجين SpO2، مستشعر حرارة الجسم',
      'الاتصال': 'Cellular 4G LTE + GPS + Bluetooth 5.3 + Wi-Fi'
    },
    features: ['هيكل تيتانيوم من فئة الطيران', 'زر الإجراءات Action Button البرتقالي', 'نظام ملاحة متطور للمغامرات والرياضة', 'تتبع دقيق لمراحل النوم وتخطيط القلب'],
    tags: ['Smartwatch', 'Watch Ultra', 'TechHaven', 'Fitness', 'Titanium'],
    badge: 'POPULAR',
    badge_color: 'cyan',
    rating: 4.8,
    review_count: 96,
    sold_count: 185,
    images: ['/images/prod-watch.jpg', '/images/hero-1.jpg'],
    thumbnail: '/images/prod-watch.jpg',
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString()
  },
  {
    id: 'prod-phone',
    sku: 'TH-PHONE-15PM',
    name: 'TH Phone 15 Pro Max 256GB Titanium',
    name_en: 'TH Phone 15 Pro Max Titanium',
    slug: 'th-phone-15-pro-max',
    category_id: 'cat-smartphones',
    brand: 'TechHaven',
    model: 'Phone 15 Pro Max 256GB',
    price: 49999,
    old_price: 54999,
    cost_price: 42000,
    stock_qty: 12,
    images: ['/images/prod-phone.jpg', '/images/hero-1.jpg'],
    thumbnail: '/images/prod-phone.jpg',
    description: 'الهاتف الأقوى بمعالج جيل قادم ثوري، تصميم تيتانيوم مصقول، نظام كاميرات احترافي بدقة 48 ميجابكسل مع تقريب بصري 5x، وشاشة ProMotion 120Hz.',
    description_en: 'Flagship smartphone with aerospace-grade titanium design, 3nm processor, 5x optical telephoto camera, and Super Retina XDR.',
    specs: {
      'حجم الشاشة': '6.7-inch Super Retina XDR OLED ProMotion 120Hz',
      'المعالج': 'Next-Gen 3nm Hexa-Core Chip',
      'سعة التخزين': '256GB NVMe High Speed',
      'نظام الكاميرات': '48MP رئيسية + 12MP فائقة الاتساع + 12MP تقريب بصري 5x',
      'الهيكل': 'Grade 5 Titanium مع زجاج خلفي غير لامع',
      'المنافذ والشحن': 'USB-C 3.0 (حتى 10Gb/s) مع شحن سريع 30W'
    },
    features: ['أخف وأقوى تصميم تيتانيوم', 'تقريب بصري حقيقي 5x بأطول بعد بؤري', 'معالج رسوميات يدعم تتبع الأشعة العتادي Hardware Ray Tracing', 'زر إجراءات Action Button قابل للتخصيص'],
    tags: ['Smartphone', 'Phone 15 Pro Max', 'TechHaven', 'Titanium', '5G'],
    badge: 'FLAGSHIP',
    badge_color: 'hot',
    rating: 4.95,
    review_count: 240,
    sold_count: 420,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString()
  },
  {
    id: 'prod-laptop',
    sku: 'TH-AEROBOOK-14',
    name: 'TechHaven AeroBook 14 OLED Laptop',
    name_en: 'TechHaven AeroBook 14 Ultra-Thin OLED',
    slug: 'techhaven-aerobook-14',
    category_id: 'cat-laptops',
    brand: 'TechHaven',
    model: 'AeroBook 14 Evo Edition',
    price: 34999,
    old_price: 39999,
    cost_price: 29000,
    stock_qty: 15,
    images: ['/images/prod-laptop.jpg', '/images/hero-2.jpg'],
    thumbnail: '/images/prod-laptop.jpg',
    description: 'لابتوب فائق الخفة والنحافة بوزن 1.2 كجم فقط، شاشة 2.8K OLED 120Hz ساحرة، معالج فائق السرعة، وبطارية تدوم طوال اليوم حتى 18 ساعة.',
    description_en: 'Ultra-portable 14-inch laptop featuring 2.8K OLED 120Hz display, all-day battery life, and aerospace aluminum chassis.',
    specs: {
      'الشاشة': '14.0-inch 2.8K (2880x1800) OLED 120Hz 100% DCI-P3 500 nits',
      'المعالج': 'Next-Gen Ultra 7 with AI NPU Co-processor',
      'الذاكرة العشوائية (RAM)': '16GB LPDDR5X 7467MHz Dual-Channel',
      'وحدة التخزين': '1TB PCIe Gen4 NVMe SSD',
      'الوزن والسمك': '1.24 كجم / سمك 13.9 مم فقط',
      'البطارية والشحن': '75Wh تدوم حتى 18 ساعة مع شحن سريع 65W GaN'
    },
    features: ['شاشة OLED مذهلة بدقة 2.8K وألوان سينمائية', 'هيكل ألومنيوم ميكانيكي بالكامل بوزن ريشة', 'كيبورد مضاء بإحساس مريح ولوحة لمس زجاجية رحبة', 'منفذا Thunderbolt 4 / USB4 فائق السرعة'],
    tags: ['Laptop', 'AeroBook', 'TechHaven', 'OLED', 'Ultraportable'],
    badge: 'SALE -12%',
    badge_color: 'violet',
    rating: 4.85,
    review_count: 74,
    sold_count: 145,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 'prod-camera',
    sku: 'TH-CAPTURE-X1',
    name: 'TH Capture X1 Mirrorless 4K Camera',
    name_en: 'TH Capture X1 4K Cinema Camera',
    slug: 'th-capture-x1-camera',
    category_id: 'cat-cameras',
    brand: 'TechHaven',
    model: 'Capture X1 Mark I',
    price: 42500,
    old_price: 46000,
    cost_price: 36000,
    stock_qty: 8,
    images: ['/images/prod-camera.jpg', '/images/hero-3.jpg'],
    thumbnail: '/images/prod-camera.jpg',
    description: 'كاميرا بدون مرآة متطورة للتصوير الفوتوغرافي والفيديو السينمائي بدقة 4K 120fps، مع مستشعر Full Frame وتثبيت بصري خماسي المحاور IBIS.',
    description_en: 'Professional mirrorless full-frame 4K camera with 5-axis IBIS, real-time eye autofocus, and 10-bit cinema video profiles.',
    specs: {
      'المستشعر': '33MP Full-Frame Exmor R Back-Illuminated CMOS',
      'تصوير الفيديو': '4K 60p 10-bit 4:2:2 All-Intra بدون اقتطاع / 4K 120p S&Q',
      'التثبيت البصري': '5-Axis In-Body Optical Image Stabilization (5.5 وقفات)',
      'نقاط التركيز': '759 نقطة تركيز بؤري مع ذكاء اصطناعي لتتبع العين والوجوه',
      'منفذ التخزين': 'Dual Slot CFexpress Type A / SD UHS-II',
      'الشاشة والمنظار': 'شاشة لمس متحركة بالكامل 3.0 بوصة + منظار إلكتروني OLED 3.68M نقطة'
    },
    features: ['مستشعر إطار كامل متفوق في الإضاءة المنخفضة', 'تتبع ذكي فائق الدقة للعين والأجسام بالذكاء الاصطناعي', 'تسجيل بروفايل S-Cinetone السينمائي الجاهز بدون تلوين', 'منفذ HDMI كامل الحجم ومنافذ مايك وسماعة منفصلة'],
    tags: ['Camera', 'Mirrorless', 'TechHaven', '4K Video', 'Cinema'],
    badge: 'PRO',
    badge_color: 'cyan',
    rating: 4.9,
    review_count: 53,
    sold_count: 67,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 'prod-speaker',
    sku: 'TH-SOUNDBOOM-360',
    name: 'TH SoundBoom 360 Wireless Speaker',
    name_en: 'TH SoundBoom 360 Spatial Speaker',
    slug: 'th-soundboom-360',
    category_id: 'cat-speakers',
    brand: 'TechHaven',
    model: 'SoundBoom 360 Gen 1',
    price: 6800,
    old_price: 7900,
    cost_price: 5000,
    stock_qty: 32,
    images: ['/images/prod-speaker.jpg'],
    thumbnail: '/images/prod-speaker.jpg',
    description: 'مكبر صوت بلوتوث أسطواني يقدم صوتاً مكانياً حقيقياً بزاوية 360 درجة مع مضخم صوت عميق Bass وحلقة إضاءة محيطية تفاعلية.',
    description_en: '360-degree immersive acoustic Bluetooth speaker with dynamic bass radiators and ambient synchronized LED halo.',
    specs: {
      'النظام الصوتي': '360° Omnidirectional Acoustic Architecture',
      'القدرة الكهربية (RMS)': '60W RMS High Output Sound',
      'عمر البطارية': 'حتى 20 ساعة تشغيل متواصل (بطارية 8000mAh)',
      'مقاومة الماء والغبار': 'معيار IP67 الغطس الكامل في الماء ومقاومة الصدمات',
      'الاتصال والميزات': 'Bluetooth 5.3 + AUX 3.5mm + ميكروفون لإجراء المكالمات',
      'الإضاءة': 'حلقة LED سفلية تفاعلية بألوان متعددة'
    },
    features: ['توزيع صوتي محيطي كامل 360 درجة يغمر أي غرفة', 'صوت بيز عميق ونقي بفضل مضخمات الصوت المزدوجة', 'هيكل ألومنيوم وقماش صوتي مضاد للماء بالكامل', 'إمكانية ربط سماعتين معاً لصوت ستيريو حقيقي True Wireless'],
    tags: ['Speaker', 'Bluetooth', 'TechHaven', 'Spatial Audio', 'Waterproof'],
    badge: 'HOT',
    badge_color: 'hot',
    rating: 4.75,
    review_count: 88,
    sold_count: 220,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 22 * 86400000).toISOString()
  },
  {
    id: 'prod-controller',
    sku: 'TH-ELITE-PAD',
    name: 'TH Elite Wireless Pro Controller',
    name_en: 'TH Elite Wireless Pro Controller',
    slug: 'th-elite-wireless-pro-controller',
    category_id: 'cat-gaming',
    brand: 'TechHaven',
    model: 'Elite Pro Wireless',
    price: 4200,
    old_price: 4800,
    cost_price: 3200,
    stock_qty: 24,
    images: ['/images/hero-2.jpg'],
    thumbnail: '/images/hero-2.jpg',
    description: 'يد تحكم لاسلكية احترافية مع أزرار خلفية قابلة للبرمجة، ومحفزات سريعة Trigger Locks، وحساسات Hall Effect المقاومة للـ Drift.',
    description_en: 'High-performance competitive wireless gamepad with Hall Effect sticks and programmable paddles.',
    specs: {
      'التوصيل': '2.4GHz Wireless Dongle + Bluetooth + USB-C',
      'العصي': 'Hall Effect Magnetic Anti-Drift Sticks',
      'الأزرار الخلفية': '4 أزرار معدنية ميكانيكية قابلة للبرمجة',
      'البطارية': 'حتى 40 ساعة لعب متواصل'
    },
    features: ['حساسات هول إفكت ضد الدريفت', 'محفزات كليك ماوس سريعة للألعاب التنافسية', 'بروفايلات مخصصة محفوظة بالذاكرة الداخلية'],
    tags: ['Gaming', 'Controller', 'Gamepad', 'TechHaven'],
    badge: 'PRO GAMING',
    badge_color: 'cyan',
    rating: 4.88,
    review_count: 65,
    sold_count: 140,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString()
  },
  {
    id: 'prod-drone',
    sku: 'TH-SKYMASTER-4K',
    name: 'TH SkyMaster 4K Mini Drone',
    name_en: 'TH SkyMaster 4K Compact Drone',
    slug: 'th-skymaster-4k-mini-drone',
    category_id: 'cat-drones',
    brand: 'TechHaven',
    model: 'SkyMaster 4K Cine',
    price: 28900,
    old_price: 32500,
    cost_price: 23000,
    stock_qty: 9,
    images: ['/images/hero-3.jpg'],
    thumbnail: '/images/hero-3.jpg',
    description: 'طائرة درون ذكية فائقة الخفة بوزن أقل من 249 جرام، كاميرا 4K مع جيمبال 3 محاور، ومدى طيران حتى 10 كم وبطارية تدوم 38 دقيقة.',
    description_en: 'Sub-249g ultra-compact 4K aerial camera drone with 3-axis gimbal and 38-minute flight time.',
    specs: {
      'الوزن': '246 جرام (لا يتطلب ترخيص معقد في معظم الدول)',
      'الكاميرا': '4K HDR 60fps مع حساس 1/1.3-inch CMOS',
      'التثبيت': '3-Axis Mechanical Gimbal',
      'زمن الطيران': 'حتى 38 دقيقة لكل بطارية',
      'مدى الإرسال': 'حتى 10 كيلومتر بدقة FHD'
    },
    features: ['تصوير عمودي حقيقي True Vertical لـ Reels و TikTok', 'مستشعرات تجنب العوائق في 3 اتجاهات', 'أوضاع تصوير سينمائي تلقائية QuickShots'],
    tags: ['Drone', '4K', 'Aerial', 'TechHaven'],
    badge: '4K CINE',
    badge_color: 'hot',
    rating: 4.92,
    review_count: 42,
    sold_count: 58,
    is_active: true,
    is_featured: true,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString()
  }
];

// Seed Users
async function initLocalStore() {
  const loaded = loadStoreFromDisk();

  if (!loaded) {
    // Add seed categories
    for (const cat of SEED_CATEGORIES) {
      localStore.set(`cat:${cat.id}`, cat);
      localStore.set(`cat_slug:${cat.slug}`, cat);
    }

    // Add seed products
    for (const prod of SEED_PRODUCTS) {
      localStore.set(`product:${prod.id}`, prod);
    }
  }

  // 👑 Primary Super Admin Account (Owner) — only create if missing
  if (!localStore.has('email:abdelrahman959@gmail.com')) {
    const abdoHash = await bcrypt.hash('1131abdo', 10);
    const primaryAdmin = {
      id: 'admin-abdelrahman',
      email: 'abdelrahman959@gmail.com',
      password_hash: abdoHash,
      full_name: 'م. عبد الرحمن (المدير العام)',
      phone: '01000000001',
      role: 'admin',
      is_super_admin: true,
      created_at: new Date().toISOString()
    };
    localStore.set(`email:abdelrahman959@gmail.com`, primaryAdmin);
    localStore.set(`id:admin-abdelrahman`, primaryAdmin);
  }

  // Backup admin accounts — only create if canonical admin is missing
  if (!localStore.has('email:admin@techhaven.com')) {
    const adminHash = await bcrypt.hash('admin123', 10);

    const defaultAdmin = {
      id: 'user-admin-1',
      email: 'admin@techhaven.com',
      password_hash: adminHash,
      full_name: 'إدارة TechHaven (Admin)',
      phone: '01000000002',
      role: 'admin',
      created_at: new Date().toISOString()
    };

    // Create each admin alias
    const adminEmails = [
      'admin@techhaven.com',
      'admin@techhaven.eg',
      'admin@techhaven.com.eg',
      'admin@egyhardware.com',
      'admin@egyhardware.eg',
      'admin@admin.com',
      'admin'
    ];

    for (const email of adminEmails) {
      const account = { ...defaultAdmin, email };
      localStore.set(`email:${email.toLowerCase()}`, account);
    }
    localStore.set(`id:${defaultAdmin.id}`, defaultAdmin);
  }

  // Regular user accounts — only create if canonical user is missing
  if (!localStore.has('email:user@techhaven.com')) {
    const userHash = await bcrypt.hash('user123', 10);

    const regularUser = {
      id: 'user-gamer-1',
      email: 'user@techhaven.com',
      password_hash: userHash,
      full_name: 'أحمد محمود (عميل موثق)',
      phone: '01123456789',
      role: 'user',
      created_at: new Date().toISOString()
    };

    // Create each user alias
    const userEmails = [
      'user@techhaven.com',
      'user@egyhardware.com',
      'gamer@egyhardware.eg',
      'user@user.com'
    ];

    for (const email of userEmails) {
      const account = { ...regularUser, email };
      localStore.set(`email:${email.toLowerCase()}`, account);
    }
    localStore.set(`id:${regularUser.id}`, regularUser);
  }

  // Persist store to disk
  saveStoreToDisk();
}

// ── Cart contract helpers (P2-2) ────────────────────────────────
// Canonical persisted+returned shape: ARRAY of cart item objects.
//   Item: { id, product_id, name, name_en, brand, price, unit_price,
//           old_price, thumbnail, image, images, quantity, product,
//           custom_specs, created_at }
// Subtotal is NEVER stored on the cart — consumers derive it; the
// server stays authoritative for all pricing.
//
// migrateCartToCanonical(raw): idempotent legacy migration.
//   - Array            → returned as-is (canonical)
//   - Legacy object    → { items: [...] } unwraps to the items array,
//                        preserving every item and quantity (no dupes)
//   - Anything else    → [] (malformed; fail-safe, never throws)
//   - object with NO .items array (e.g. { subtotal }) → [] (nothing to save)
function migrateCartToCanonical(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray(raw.items)) return raw.items;
  return [];
}

initLocalStore().catch(console.error);

// ── Database Abstraction Methods ─────────────────────────────────
export const db = {
  // ── Users ──
  async findUserByEmail(email) {
    if (!supabaseUrl) return localStore.get(`email:${email?.toLowerCase()}`) || null;
    const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async findUserById(id) {
    if (!supabaseUrl) return localStore.get(`id:${id}`) || null;
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createUser(user) {
    user.email = user.email.toLowerCase();
    if (!supabaseUrl) {
      localStore.set(`email:${user.email}`, user);
      localStore.set(`id:${user.id}`, user);
      saveStoreToDisk();
      return user;
    }
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
  },

  async updateUser(id, updates) {
    if (!supabaseUrl) {
      const u = localStore.get(`id:${id}`);
      if (!u) return null;
      const updated = { ...u, ...updates, updated_at: new Date().toISOString() };
      localStore.set(`id:${id}`, updated);
      if (updated.email) localStore.set(`email:${updated.email.toLowerCase()}`, updated);
      saveStoreToDisk();
      return updated;
    }
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteUser(id) {
    if (id === 'admin-abdelrahman') {
      throw new Error('لا يمكن حذف حساب المدير العام الرئيسي');
    }
    if (!supabaseUrl) {
      const u = localStore.get(`id:${id}`);
      if (u) {
        localStore.delete(`id:${id}`);
        if (u.email) localStore.delete(`email:${u.email.toLowerCase()}`);
        saveStoreToDisk();
        return true;
      }
      return false;
    }
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async getAllUsers() {
    if (!supabaseUrl) {
      const users = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('id:')) users.push(val);
      }
      return users;
    }
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  },

  // ── Categories ──
  async getAllCategories() {
    if (!supabaseUrl) {
      const cats = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('cat:')) cats.push(val);
      }
      if (cats.length > 0) {
        return cats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }
      return SEED_CATEGORIES;
    }
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getCategoryBySlug(slug) {
    if (!supabaseUrl) {
      const direct = localStore.get(`cat_slug:${slug}`) || localStore.get(`cat:${slug}`);
      if (direct) return direct;
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('cat:') && (val.slug === slug || val.id === slug)) {
          return val;
        }
      }
      return SEED_CATEGORIES.find((c) => c.slug === slug || c.id === slug) || null;
    }
    const { data, error } = await supabase.from('categories').select('*').or(`slug.eq.${slug},id.eq.${slug}`).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // ── Products ──
  async getAllProducts() {
    if (!supabaseUrl) {
      const products = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('product:')) products.push(val);
      }
      return products;
    }
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    return data;
  },

  async queryProducts(params = {}) {
    const {
      category,
      search,
      sort = 'newest',
      page = 1,
      limit = 50,
      minPrice,
      maxPrice,
      brand,
      inStock,
      featured,
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 250);

    if (!supabaseUrl || !supabase) {
      let products = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('product:')) products.push(val);
      }

      // Filter by Category
      if (category && category !== 'all') {
        const catKey = String(category).toLowerCase().trim();
        products = products.filter(p => {
          const pCat = String(p.category_id || '').toLowerCase();
          return (
            pCat === catKey ||
            pCat === `cat-${catKey}` ||
            (catKey.startsWith('cat-') && pCat === catKey.replace(/^cat-/, ''))
          );
        });
      }

      // Filter by Search (Arabic & English text matching across name, name_en, description, description_en, brand, model, sku, tags)
      if (search) {
        const q = String(search).toLowerCase().trim();
        if (q) {
          products = products.filter(p => {
            const name = String(p.name || '').toLowerCase();
            const nameEn = String(p.name_en || '').toLowerCase();
            const desc = String(p.description || '').toLowerCase();
            const descEn = String(p.description_en || '').toLowerCase();
            const pBrand = String(p.brand || '').toLowerCase();
            const model = String(p.model || '').toLowerCase();
            const sku = String(p.sku || '').toLowerCase();
            const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase()) : [];
            return (
              name.includes(q) ||
              nameEn.includes(q) ||
              desc.includes(q) ||
              descEn.includes(q) ||
              pBrand.includes(q) ||
              model.includes(q) ||
              sku.includes(q) ||
              tags.some(t => t.includes(q))
            );
          });
        }
      }

      // Filter by Price Range
      if (minPrice !== undefined && minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice))) {
        products = products.filter(p => (Number(p.price) || 0) >= Number(minPrice));
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice))) {
        products = products.filter(p => (Number(p.price) || 0) <= Number(maxPrice));
      }

      // Filter by Brand (comma separated or single)
      if (brand && brand !== 'all') {
        const brands = String(brand).split(',').map(b => b.toLowerCase().trim()).filter(Boolean);
        if (brands.length > 0) {
          products = products.filter(p => brands.includes(String(p.brand || '').toLowerCase()));
        }
      }

      // Filter by Stock
      if (inStock === 'true' || inStock === true) {
        products = products.filter(p => (Number(p.stock_qty) || 0) > 0);
      }

      // Filter by Featured
      if (featured === 'true' || featured === true) {
        products = products.filter(p => Boolean(p.is_featured));
      }

      // Global Sort with Deterministic Tie-breaker (id)
      products.sort((a, b) => {
        let diff = 0;
        switch (sort) {
          case 'price-asc':
          case 'price_asc':
            diff = (Number(a.price) || 0) - (Number(b.price) || 0);
            break;
          case 'price-desc':
          case 'price_desc':
            diff = (Number(b.price) || 0) - (Number(a.price) || 0);
            break;
          case 'rating':
            diff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
            break;
          case 'popular':
          case 'featured':
            if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
              return b.is_featured ? 1 : -1;
            }
            diff = (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0);
            break;
          case 'discount': {
            const discA = a.old_price && a.old_price > a.price ? (a.old_price - a.price) / a.old_price : 0;
            const discB = b.old_price && b.old_price > b.price ? (b.old_price - b.price) / b.old_price : 0;
            diff = discB - discA;
            break;
          }
          case 'oldest':
            diff = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            break;
          case 'newest':
          default:
            diff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            break;
        }
        if (diff !== 0) return diff;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });

      // Pagination
      const total = products.length;
      const pages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);
      const offset = (pageNum - 1) * limitNum;
      const paginated = products.slice(offset, offset + limitNum);

      return {
        data: paginated,
        products: paginated,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages,
        },
        total,
        page: pageNum,
        limit: limitNum,
        pages,
      };
    }

    // ── Supabase / PostgreSQL Query Path ──
    let query = supabase.from('products').select('*', { count: 'exact' });

    // Category Filter
    if (category && category !== 'all') {
      const catStr = String(category).trim();
      if (catStr.startsWith('cat-')) {
        query = query.in('category_id', [catStr, catStr.replace(/^cat-/, '')]);
      } else {
        query = query.in('category_id', [catStr, `cat-${catStr}`]);
      }
    }

    // Search Query (Arabic & English text across name, name_en, description, brand, model, sku, tags)
    if (search) {
      const cleanSearch = String(search).replace(/[,()"]/g, ' ').trim();
      if (cleanSearch) {
        query = query.or(
          `name.ilike.%${cleanSearch}%,name_en.ilike.%${cleanSearch}%,description.ilike.%${cleanSearch}%,brand.ilike.%${cleanSearch}%,model.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,tags::text.ilike.%${cleanSearch}%`
        );
      }
    }

    // Price Filter
    if (minPrice !== undefined && minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice))) {
      query = query.gte('price', Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice))) {
      query = query.lte('price', Number(maxPrice));
    }

    // Brand Filter
    if (brand && brand !== 'all') {
      const brands = String(brand).split(',').map(b => b.trim()).filter(Boolean);
      if (brands.length === 1) {
        query = query.ilike('brand', brands[0]);
      } else if (brands.length > 1) {
        const orClauses = brands.map(b => `brand.ilike.${b.replace(/[,()"]/g, '')}`).join(',');
        query = query.or(orClauses);
      }
    }

    // Stock Filter
    if (inStock === 'true' || inStock === true) {
      query = query.gt('stock_qty', 0);
    }

    // Featured Filter
    if (featured === 'true' || featured === true) {
      query = query.eq('is_featured', true);
    }

    // Global Sorting with Deterministic Tie-breaker (id)
    switch (sort) {
      case 'price-asc':
      case 'price_asc':
        query = query.order('price', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
        break;
      case 'price-desc':
      case 'price_desc':
        query = query.order('price', { ascending: false, nullsFirst: false }).order('id', { ascending: true });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false, nullsFirst: false }).order('id', { ascending: true });
        break;
      case 'popular':
      case 'featured':
        query = query
          .order('is_featured', { ascending: false, nullsFirst: false })
          .order('sold_count', { ascending: false, nullsFirst: false })
          .order('id', { ascending: true });
        break;
      case 'discount':
        query = query
          .order('old_price', { ascending: false, nullsFirst: false })
          .order('price', { ascending: true })
          .order('id', { ascending: true });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true, nullsFirst: false }).order('id', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true });
        break;
    }

    // Pagination at DB level
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    const total = count !== null && count !== undefined ? count : (data ? data.length : 0);
    const pages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);
    const resultProducts = data || [];

    return {
      data: resultProducts,
      products: resultProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages,
      },
      total,
      page: pageNum,
      limit: limitNum,
      pages,
    };
  },

  async getProduct(id) {
    if (!id) return null;
    if (!supabaseUrl) {
      return localStore.get(`product:${id}`) || null;
    }
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getProductBySlugOrSku(identifier) {
    if (!identifier) return null;
    if (!supabaseUrl) {
      const idLower = String(identifier).toLowerCase();
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('product:')) {
          if (val.slug === identifier || (val.sku && val.sku.toLowerCase() === idLower)) {
            return val;
          }
        }
      }
      return null;
    }
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`slug.eq.${identifier},sku.ilike.${identifier}`)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // Alias for compatibility
  async getProductById(id) {
    return this.getProduct(id);
  },

  async createProduct(product) {
    if (!supabaseUrl) {
      localStore.set(`product:${product.id}`, product);
      saveStoreToDisk();
      return product;
    }
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id, updates) {
    if (!supabaseUrl) {
      const product = localStore.get(`product:${id}`);
      if (!product) return null;
      const updated = { ...product, ...updates, updated_at: new Date().toISOString() };
      localStore.set(`product:${id}`, updated);
      saveStoreToDisk();
      return updated;
    }
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id) {
    if (!supabaseUrl) {
      localStore.delete(`product:${id}`);
      saveStoreToDisk();
      return true;
    }
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ── Cart ──
  // Canonical contract: cart is ALWAYS an array of item objects (see
  // migrateCartToCanonical above). Legacy object-shape carts ({ items, ... })
  // are converted at every read/write boundary.
  async getCart(userId) {
    if (!supabaseUrl) {
      const raw = localStore.get(`cart:${userId}`);
      const cart = migrateCartToCanonical(raw);
      // Persist the migrated canonical form if it was legacy/dirty so the
      // store on disk becomes clean.
      if (raw !== cart) {
        localStore.set(`cart:${userId}`, cart);
        saveStoreToDisk();
      }
      return cart;
    }
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return migrateCartToCanonical(data);
  },

  async upsertCartItem(userId, item) {
    if (!supabaseUrl) {
      const cart = migrateCartToCanonical(localStore.get(`cart:${userId}`));
      const existingIdx = cart.findIndex((i) => i.product_id === item.product_id);
      if (existingIdx >= 0) {
        cart[existingIdx] = { ...cart[existingIdx], ...item };
      } else {
        cart.push(item);
      }
      localStore.set(`cart:${userId}`, cart);
      saveStoreToDisk();
      return cart;
    }
    const { data, error } = await supabase
      .from('cart_items')
      .upsert({ ...item, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateCartItem(userId, productId, updates) {
    if (!supabaseUrl) {
      const cart = migrateCartToCanonical(localStore.get(`cart:${userId}`));
      const item = cart.find((i) => i.product_id === productId);
      if (item) {
        Object.assign(item, updates);
        localStore.set(`cart:${userId}`, cart);
        saveStoreToDisk();
      }
      return cart;
    }
    const { data, error } = await supabase
      .from('cart_items')
      .update(updates)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeCartItem(userId, productId) {
    if (!supabaseUrl) {
      const cart = migrateCartToCanonical(localStore.get(`cart:${userId}`));
      const filtered = cart.filter((i) => i.product_id !== productId);
      localStore.set(`cart:${userId}`, filtered);
      saveStoreToDisk();
      return filtered;
    }
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
    return true;
  },

  async clearCart(userId) {
    if (!supabaseUrl) {
      localStore.set(`cart:${userId}`, []);
      saveStoreToDisk();
      return [];
    }
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
    return [];
  },

  // ── Wishlist (Persistent, Per-User) ──
  // Local store uses key `wishlist:${userId}` containing an array of
  // { product_id, added_at }. Supabase uses the `wishlist` table (schema.sql).
  // Idempotent on add; safe no-op on duplicate or missing remove.
  async getWishlist(userId) {
    if (!supabaseUrl) {
      const raw = localStore.get(`wishlist:${userId}`);
      if (!Array.isArray(raw)) return [];
      return raw;
    }
    const { data, error } = await supabase
      .from('wishlist')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async addToWishlist(userId, productId) {
    // Validate product exists before adding
    const product = await this.getProduct(productId);
    if (!product) {
      const err = new Error('المنتج غير موجود');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!supabaseUrl) {
      const raw = localStore.get(`wishlist:${userId}`);
      const list = Array.isArray(raw) ? raw : [];
      const exists = list.some((i) => i.product_id === productId || i.productId === productId);
      if (!exists) {
        list.push({
          product_id: productId,
          added_at: new Date().toISOString()
        });
        localStore.set(`wishlist:${userId}`, list);
        saveStoreToDisk();
      }
      return list;
    }

    // Supabase: insert row (or ignore duplicate if unique constraint exists)
    const { data, error } = await supabase
      .from('wishlist')
      .insert({ user_id: userId, product_id: productId })
      .select();
    if (error) {
      let parsed = null;
      try {
        parsed = JSON.parse(error.message);
      } catch {
        // error.message is not JSON — keep the raw error message
      }
      if (parsed && parsed.code) {
        const customErr = new Error(parsed.error || error.message);
        customErr.code = parsed.code;
        customErr.details = parsed;
        throw customErr;
      }
      throw error;
    }
    return data;
  },

  async removeFromWishlist(userId, productId) {
    if (!supabaseUrl) {
      const raw = localStore.get(`wishlist:${userId}`);
      const list = Array.isArray(raw) ? raw : [];
      const filtered = list.filter((i) => i.product_id !== productId && i.productId !== productId);
      localStore.set(`wishlist:${userId}`, filtered);
      saveStoreToDisk();
      return filtered;
    }
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
    return true;
  },

  // ── Orders ──
  async getOrders(userId = null) {
    if (!supabaseUrl) {
      const orders = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('order:')) {
          if (!userId || val.user_id === userId) {
            orders.push(val);
          }
        }
      }
      return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    let query = supabase.from('orders').select('*, order_items(*)');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },

      /**
       * Admin dashboard order statistics (SCA-2).
       *
       * Supabase path: EVERY aggregate is computed by the database — Node only
       * receives aggregate results (0 rows for counts, 1 row for the revenue sum,
       * and at most 8 rows for recentOrders). The full orders table is NEVER
       * fetched just to compute dashboard stats.
       *
       * Semantics are identical to the previous in-memory calculation:
       *  - totalRevenue    = SUM of `total` over ALL orders (all statuses — the
       *                      pre-existing definition, deliberately unchanged)
       *  - totalOrders     = order count
       *  - completedOrders = orders with status === 'delivered'
       *  - recentOrders    = 8 newest orders by created_at DESC, order_items
       *                      embedded (same selection as getOrders())
       *
       * Local fallback: same formulas over localStore (allowed to stay O(N)).
       */
      async getAdminOrderStats() {
        if (!supabaseUrl) {
          const orders = [];
          for (const [key, val] of localStore.entries()) {
            if (key.startsWith('order:')) orders.push(val);
          }
          orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          let totalRevenue = 0;
          let completedOrders = 0;
          for (const o of orders) {
            totalRevenue += Number(o.total) || 0;
            if (o.status === 'delivered') completedOrders += 1;
          }

          return {
            totalRevenue,
            totalOrders: orders.length,
            completedOrders,
            recentOrders: orders.slice(0, 8),
          };
        }

        // ── Supabase / PostgreSQL aggregation path ──
        // 1) Total orders — exact COUNT, zero rows transferred.
        const { count: totalCount, error: totalErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });
        if (totalErr) throw totalErr;

        // 2) Completed (delivered) orders — exact COUNT, zero rows transferred.
        const { count: deliveredCount, error: deliveredErr } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'delivered');
        if (deliveredErr) throw deliveredErr;

        // 3) Total revenue — DB-side SUM, ONE row transferred.
        const { data: sumRows, error: sumErr } = await supabase
          .from('orders')
          .select('sum(total)');
        if (sumErr) throw sumErr;
        const totalRevenue = sumRows && sumRows.length > 0 ? Number(sumRows[0].sum) || 0 : 0;

        // 4) Recent orders — bounded to 8 rows (same selection/ordering as getOrders()).
        const { data: recentOrders, error: recentErr } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false })
          .limit(8);
        if (recentErr) throw recentErr;

        return {
          totalRevenue,
          totalOrders: totalCount ?? 0,
          completedOrders: deliveredCount ?? 0,
          recentOrders: recentOrders || [],
        };
      },

  async getOrder(idOrRef) {
    if (!supabaseUrl) {
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('order:') && (val.id === idOrRef || val.reference === idOrRef)) {
          return val;
        }
      }
      return null;
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .or(`id.eq.${idOrRef},reference.eq.${idOrRef}`)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createOrder(order, items = []) {
    if (!supabaseUrl) {
      order.order_items = items;
      localStore.set(`order:${order.id}`, order);
      saveStoreToDisk();
      return order;
    }
    const { data, error } = await supabase.from('orders').insert(order).select().single();
    if (error) throw error;
    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) console.error('Error inserting order items:', itemsErr);
    }
    return data;
  },

  async processOrderCheckoutLocal(orderPayload) {
    const {
      id,
      reference,
      user_id,
      session_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_city,
      customer_address,
      customer_notes,
      payment_method,
      payment_status,
      status,
      shipping_cost = 0,
      discount_amount = 0,
      coupon_code = null,
      items = [],
      timeline = []
    } = orderPayload;

    // 1. Validation
    const custName = customer_name?.trim();
    if (!custName || !customer_phone?.trim() || !customer_address?.trim() || !customer_city?.trim()) {
      const err = new Error('يرجى إكمال جميع بيانات العميل والعنوان');
      err.code = 'INVALID_DATA';
      throw err;
    }

    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('سلة المشتريات فارغة');
      err.code = 'EMPTY_CART';
      throw err;
    }

    // 2. Validate Items & Aggregate Quantities
    const aggQuantities = new Map();
    for (const it of items) {
      const pId = it.productId || it.product_id || it.id;
      if (!pId) {
        const err = new Error('بيانات المنتج غير صالحة');
        err.code = 'INVALID_ITEM';
        throw err;
      }
      const rawQty = parseInt(it.quantity, 10);
      if (isNaN(rawQty) || rawQty <= 0) {
        const err = new Error('الكمية المطلوبة يجب أن تكون 1 أو أكثر');
        err.code = 'INVALID_QUANTITY';
        throw err;
      }
      aggQuantities.set(pId, (aggQuantities.get(pId) || 0) + rawQty);
    }

    // 3. Validate Stock against Authoritative Product State
    const productsToUpdate = [];
    let calculatedSubtotal = 0;

    for (const [pId, totalQty] of aggQuantities.entries()) {
      const product = localStore.get(`product:${pId}`);
      if (!product) {
        const err = new Error(`المنتج غير موجود: ${pId}`);
        err.code = 'PRODUCT_NOT_FOUND';
        throw err;
      }
      const availableStock = product.stock_qty !== undefined
        ? Number(product.stock_qty)
        : (Number(product.stock) || 0);

      if (availableStock < totalQty) {
        const err = new Error(`الكمية المطلوبة من (${product.name}) غير متوفرة. المتاح حالياً: ${availableStock}`);
        err.code = 'INSUFFICIENT_STOCK';
        err.details = {
          productId: pId,
          productName: product.name,
          availableStock,
          requestedQty: totalQty
        };
        throw err;
      }

      productsToUpdate.push({
        product,
        pId,
        availableStock,
        totalQty,
        newStock: availableStock - totalQty
      });
    }

    // 4. Calculate Subtotal from Authoritative Prices and Build Item Snapshots
    const validatedItems = [];
    for (const it of items) {
      const pId = it.productId || it.product_id || it.id;
      const product = localStore.get(`product:${pId}`);
      const qty = parseInt(it.quantity, 10);
      const authPrice = Number(product.price) || 0;
      const authCost = (product.cost_price !== undefined && product.cost_price !== null && !isNaN(Number(product.cost_price)))
        ? Number(product.cost_price)
        : null;
      const itemTotal = authPrice * qty;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        id: it.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        product_id: pId,
        product_name: product.name,
        product_sku: product.sku || pId,
        product_image: product.thumbnail || product.images?.[0] || null,
        quantity: qty,
        unit_price: authPrice,
        unit_cost: authCost,
        total_price: itemTotal,
        total_cost: authCost !== null ? authCost * qty : null,
        specs_snapshot: it.specs_snapshot || {}
      });
    }

    // 5. Calculate Total
    const finalShipping = calculatedSubtotal >= 2500 ? 0 : Number(shipping_cost || 0);
    const finalDiscount = Number(discount_amount || 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal + finalShipping - finalDiscount);

    // 6. Mutate Stock & Order in localStore
    const orderId = id || `order-${Date.now()}`;
    const orderRef = reference || `TH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      id: orderId,
      reference: orderRef,
      order_number: orderRef,
      user_id: user_id || null,
      session_id: session_id || null,
      customer_name: custName,
      customer_phone: customer_phone.trim(),
      customer_email: customer_email?.trim() || '',
      customer_city: customer_city.trim(),
      customer_address: customer_address.trim(),
      customer_notes: customer_notes || '',
      payment_method: payment_method || 'cod',
      payment_status: payment_status || 'pending',
      status: status || 'pending',
      subtotal: calculatedSubtotal,
      shipping_cost: finalShipping,
      discount_amount: finalDiscount,
      coupon_code: coupon_code || null,
      total: calculatedTotal,
      items: validatedItems,
      order_items: validatedItems,
      timeline: Array.isArray(timeline) && timeline.length > 0 ? timeline : [
        { status: 'created', label: 'تم إنشاء الطلب بنجاح', time: new Date().toISOString() }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Apply stock updates and record atomic SALE movements
    for (const { product, pId, availableStock, totalQty, newStock } of productsToUpdate) {
      localStore.set(`product:${pId}`, {
        ...product,
        stock_qty: newStock,
        stock: newStock,
        updated_at: new Date().toISOString()
      });

      const movId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
      localStore.set(`movement:${movId}`, {
        id: movId,
        product_id: pId,
        product_name: product.name,
        product_sku: product.sku || pId,
        type: 'SALE',
        quantity_delta: -totalQty,
        stock_before: availableStock,
        stock_after: newStock,
        reference_type: 'ORDER',
        reference_id: orderId,
        reason: `Order checkout sale: ${orderRef}`,
        actor_id: user_id || 'customer',
        created_at: new Date().toISOString()
      });
    }

    // Persist order
    localStore.set(`order:${orderId}`, orderData);
    saveStoreToDisk();

    return orderData;
  },

  async processOrderCheckout(orderPayload) {
    if (!supabaseUrl) {
      return this.processOrderCheckoutLocal(orderPayload);
    }
    const { data, error } = await supabase.rpc('process_order_checkout', {
      p_order_id: orderPayload.id || null,
      p_reference: orderPayload.reference || null,
      p_user_id: orderPayload.user_id || null,
      p_session_id: orderPayload.session_id || null,
      p_customer_name: orderPayload.customer_name,
      p_customer_phone: orderPayload.customer_phone,
      p_customer_email: orderPayload.customer_email || '',
      p_customer_city: orderPayload.customer_city || '',
      p_customer_address: orderPayload.customer_address,
      p_customer_notes: orderPayload.customer_notes || '',
      p_payment_method: orderPayload.payment_method || 'cod',
      p_payment_status: orderPayload.payment_status || 'pending',
      p_status: orderPayload.status || 'pending',
      p_shipping_cost: orderPayload.shipping_cost || 0,
      p_discount_amount: orderPayload.discount_amount || 0,
      p_coupon_code: orderPayload.coupon_code || null,
      p_items: orderPayload.items || [],
      p_timeline: orderPayload.timeline || []
    });

    if (error) {
      let parsed = null;
      try {
        parsed = JSON.parse(error.message);
      } catch {
        // error.message is not JSON — keep the raw error message
      }
      if (parsed && parsed.code) {
        const customErr = new Error(parsed.error || error.message);
        customErr.code = parsed.code;
        customErr.details = parsed;
        throw customErr;
      }
      throw error;
    }
    return data;
  },

  async updateOrder(id, updates) {
    if (!supabaseUrl) {
      const order = localStore.get(`order:${id}`);
      if (!order) return null;
      const updated = { ...order, ...updates, updated_at: new Date().toISOString() };
      localStore.set(`order:${id}`, updated);
      saveStoreToDisk();
      return updated;
    }
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ── B2B Requests ──
  async createB2BRequest(reqData) {
    if (!supabaseUrl) {
      const id = `b2b-${Date.now()}`;
      const record = { id, ...reqData, status: 'new', created_at: new Date().toISOString() };
      localStore.set(`b2b:${id}`, record);
      saveStoreToDisk();
      return record;
    }
    const { data, error } = await supabase.from('b2b_requests').insert(reqData).select().single();
    if (error) throw error;
    return data;
  },

  async getB2BRequests() {
    if (!supabaseUrl) {
      const list = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('b2b:')) list.push(val);
      }
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { data, error } = await supabase.from('b2b_requests').select('*');
    if (error) throw error;
    return data;
  },

  async updateB2BRequest(id, updates) {
    if (!supabaseUrl) {
      const existing = localStore.get(`b2b:${id}`);
      if (!existing) return null;
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      localStore.set(`b2b:${id}`, updated);
      saveStoreToDisk();
      return updated;
    }
    const { data, error } = await supabase.from('b2b_requests').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // ── Categories CRUD ──
  async createCategory(catData) {
    if (!supabaseUrl) {
      const id = catData.id || `cat-${catData.slug || Date.now()}`;
      const record = { id, is_active: true, sort_order: 10, ...catData };
      localStore.set(`cat:${id}`, record);
      localStore.set(`cat_slug:${record.slug}`, record);
      saveStoreToDisk();
      return record;
    }
    const { data, error } = await supabase.from('categories').insert(catData).select().single();
    if (error) throw error;
    return data;
  },

  async updateCategory(id, updateData) {
    if (!supabaseUrl) {
      const existing = localStore.get(`cat:${id}`) || SEED_CATEGORIES.find((c) => c.id === id);
      const updated = { ...existing, ...updateData };
      localStore.set(`cat:${id}`, updated);
      if (updated.slug) localStore.set(`cat_slug:${updated.slug}`, updated);
      saveStoreToDisk();
      return updated;
    }
    const { data, error } = await supabase.from('categories').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    if (!supabaseUrl) {
      const cat = localStore.get(`cat:${id}`);
      if (cat && cat.slug) localStore.delete(`cat_slug:${cat.slug}`);
      localStore.delete(`cat:${id}`);
      saveStoreToDisk();
      return true;
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ── Store Settings ──
  async getSettings() {
    const defaultSettings = {
      store_name: 'TechHaven Egypt',
      store_name_en: 'TechHaven',
      slogan: 'SMARTER TECH. BETTER LIFE.',
      hotline: '19888',
      email: 'support@techhaven.com.eg',
      whatsapp_phone: '01274757241',
      address: 'السويس',
      commercial_reg: '409214',
      tax_card: '712-441-903',
      shipping_cairo: 55,
      shipping_governorates: 80,
      shipping_express: 120,
      free_shipping_threshold: 2500,
      estimated_days: '24-48 ساعة',
      estimated_days_gov: '2-4 أيام عمل',
      return_policy_days: 14,
      cod_extra_fee: 15,
      enable_visa: true,
      enable_meeza: true,
      enable_vodafone_cash: true,
      enable_instapay: true,
      enable_cod: true,
      vodafone_cash_phone: '01012345678',
      instapay_address: 'techhaven@instapay',
      maintenance_mode: false,
      announcement_active: true,
      announcement_text: '🔥 تخفيضات كبرى على كروت الشاشة وشاشات 240Hz لفترة محدودة | شحن مجاني للطلبات فوق 2500 ج.م',
      announcement_link: '/shop',
      // Paymob Gateway Credentials
      paymob_mode: 'sandbox', // 'sandbox' | 'live'
      paymob_api_key: '',
      paymob_public_key: '',
      paymob_secret_key: '',
      paymob_card_integration_id: '',
      paymob_wallet_integration_id: '',
      paymob_hmac_secret: '',
      // Supabase & Cloud
      supabase_url: '',
      supabase_anon_key: '',
      supabase_service_role_key: '',
      supabase_bucket_name: 'products',
      // Couriers & Shipping
      courier_provider: 'bosta', // 'bosta' | 'aramex' | 'mylerz'
      bosta_api_key: '',
      bosta_business_id: '',
      auto_create_waybill: false,
      // Notifications & Comms
      whatsapp_phone_number_id: '',
      whatsapp_access_token: '',
      whatsapp_notify_orders: true,
      email_provider: 'smtp', // 'smtp' | 'resend'
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      resend_api_key: '',
      email_notify_orders: true,
      // Tracking & Marketing
      ga4_measurement_id: '',
      meta_pixel_id: '',
      gtm_id: '',
      tiktok_pixel_id: '',
      // Social Login OAuth Configuration (Future Ready - Auth Inactive)
      google_oauth_enabled: false,
      google_client_id: '',
      google_client_secret: '',
      facebook_oauth_enabled: false,
      facebook_app_id: '',
      facebook_app_secret: '',
    };

    if (!supabaseUrl) {
      const stored = localStore.get('system:settings') || {};
      return { ...defaultSettings, ...stored };
    }
    const { data } = await supabase.from('settings').select('*').single();
    return { ...defaultSettings, ...(data || {}) };
  },

  async updateSettings(settingsData) {
    if (!supabaseUrl) {
      const current = await this.getSettings();
      const updated = { ...current, ...settingsData, updated_at: new Date().toISOString() };
      localStore.set('system:settings', updated);
      saveStoreToDisk();
      return updated;
    }
    const { data, error } = await supabase.from('settings').upsert(settingsData).select().single();
    if (error) throw error;
    return data;
  },

  // ── Reviews ──
  async createReview(review) {
    const rev = {
      ...review,
      id: review.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      created_at: review.created_at || new Date().toISOString()
    };
    if (!supabaseUrl) {
      localStore.set(`review:${rev.id}`, rev);
      saveStoreToDisk();
      return rev;
    }
    const { data, error } = await supabase.from('reviews').insert(rev).select().single();
    if (error) throw error;
    return data;
  },

  async getReviewsByProduct(productId) {
    if (!supabaseUrl) {
      const reviews = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('review:') && val.product_id === productId) {
          reviews.push(val);
        }
      }
      return reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { data, error } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAllReviews() {
    if (!supabaseUrl) {
      const reviews = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('review:')) {
          reviews.push(val);
        }
      }
      return reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getReviewById(reviewId) {
    if (!supabaseUrl) {
      return localStore.get(`review:${reviewId}`) || null;
    }
    const { data, error } = await supabase.from('reviews').select('*').eq('id', reviewId).single();
    if (error) throw error;
    return data || null;
  },

  async deleteReviewById(reviewId, userId, userRole) {
    if (!supabaseUrl) {
      const review = localStore.get(`review:${reviewId}`);
      if (!review) return null;
      if (userId && review.user_id !== userId && userRole !== 'admin') {
        throw new Error('FORBIDDEN');
      }
      localStore.delete(`review:${reviewId}`);
      saveStoreToDisk();
      return { success: true, message: 'تم حذف التقييم' };
    }
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) throw error;
    return { success: true, message: 'تم حذف التقييم' };
  },

  // ── RBAC Roles & Permissions ──
  async getRoles() {
    if (!supabaseUrl) return SEED_ROLES;
    const { data, error } = await supabase.from('roles').select('*, role_permissions(permissions(*))');
    if (error) return SEED_ROLES;
    return data;
  },

  async getRoleByCode(code) {
    if (!supabaseUrl) return SEED_ROLES.find(r => r.code === code) || null;
    const { data, error } = await supabase.from('roles').select('*, role_permissions(permissions(*))').eq('code', code).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || SEED_ROLES.find(r => r.code === code) || null;
  },

  async getPermissions() {
    if (!supabaseUrl) return SEED_PERMISSIONS;
    const { data, error } = await supabase.from('permissions').select('*');
    if (error) return SEED_PERMISSIONS;
    return data;
  },

  async getUserPermissions(userId) {
    const user = await this.findUserById(userId);
    if (!user) return [];
    const role = SEED_ROLES.find(r => r.code === user.role);
    return role ? role.permissions : [];
  },

  // ── Inventory Ledger & Atomic Movements (Batch 02) ──
  async adjustProductInventory({
    productId,
    quantityDelta,
    type = 'ADJUSTMENT_IN',
    reason = '',
    actorId = null,
    referenceType = 'STOCK_ADJUSTMENT',
    referenceId = null,
  }) {
    if (supabaseUrl && supabase) {
      const { data, error } = await supabase.rpc('adjust_product_inventory', {
        p_product_id: productId,
        p_quantity_delta: quantityDelta,
        p_type: type,
        p_reason: reason,
        p_actor_id: actorId,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
      });
      if (error) {
              let parsed = null;
              try {
                parsed = JSON.parse(error.message);
              } catch {
                // Ignore parse error, keep parsed as null
              }
              if (parsed && parsed.code) {
          const customErr = new Error(parsed.error || error.message);
          customErr.code = parsed.code;
          customErr.details = parsed;
          throw customErr;
        }
        throw error;
      }
      return data;
    }

    // Local atomic store path
    const product = localStore.get(`product:${productId}`);
    if (!product) {
      const err = new Error(`المنتج غير موجود: ${productId}`);
      err.code = 'PRODUCT_NOT_FOUND';
      throw err;
    }

    const currentStock = product.stock_qty !== undefined
      ? Number(product.stock_qty)
      : (Number(product.stock) || 0);

    const newStock = currentStock + quantityDelta;
    if (newStock < 0) {
      const err = new Error(`لا يمكن أن يصبح المخزون سالباً. المتاح حالياً: ${currentStock}`);
      err.code = 'INSUFFICIENT_STOCK';
      err.details = {
        productId,
        productName: product.name,
        currentStock,
        requestedDelta: quantityDelta,
      };
      throw err;
    }

    const movementId = `mov-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
    const movement = {
      id: movementId,
      product_id: productId,
      product_name: product.name,
      product_sku: product.sku || productId,
      type,
      quantity_delta: quantityDelta,
      stock_before: currentStock,
      stock_after: newStock,
      reference_type: referenceType || 'STOCK_ADJUSTMENT',
      reference_id: referenceId || movementId,
      reason: reason || '',
      actor_id: actorId || null,
      created_at: new Date().toISOString(),
    };

    localStore.set(`product:${productId}`, {
      ...product,
      stock_qty: newStock,
      stock: newStock,
      updated_at: new Date().toISOString(),
    });
    localStore.set(`movement:${movementId}`, movement);
    saveStoreToDisk();

    return movement;
  },

  async getInventoryMovements({
    productId,
    type,
    referenceType,
    actorId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = {}) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    if (supabaseUrl && supabase) {
      let query = supabase.from('inventory_movements').select('*', { count: 'exact' });
      if (productId) query = query.eq('product_id', productId);
      if (type) query = query.eq('type', type);
      if (referenceType) query = query.eq('reference_type', referenceType);
      if (actorId) query = query.eq('actor_id', actorId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const from = (p - 1) * l;
      const to = from + l - 1;
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      const total = count || 0;
      return {
        data: data || [],
        pagination: {
          page: p,
          limit: l,
          total,
          totalPages: Math.ceil(total / l),
        },
      };
    }

    // Local store path
    const movements = [];
    for (const [key, val] of localStore.entries()) {
      if (key.startsWith('movement:')) {
        movements.push(val);
      }
    }

    // Dynamically include INITIAL_IMPORT movements for products that don't have one recorded yet
    for (const [key, val] of localStore.entries()) {
      if (key.startsWith('product:') && val && val.id) {
        const prod = val;
        const stock = Number(prod.stock_qty !== undefined ? prod.stock_qty : (prod.stock || 0));
        const hasInitialImport = movements.some(m => m.product_id === prod.id && m.type === 'INITIAL_IMPORT');
        if (!hasInitialImport && stock > 0) {
          movements.push({
            id: `mov-init-${prod.id}`,
            product_id: prod.id,
            product_name: prod.name,
            product_sku: prod.sku || prod.id,
            type: 'INITIAL_IMPORT',
            quantity_delta: stock,
            stock_before: 0,
            stock_after: stock,
            reference_type: 'MIGRATION',
            reference_id: 'migration_b02_initial_import',
            reason: 'Initial inventory ledger import of existing stock',
            actor_id: 'system',
            created_at: prod.created_at || '2026-09-01T00:00:00.000Z'
          });
        }
      }
    }

    let filtered = movements;
    if (productId) {
      filtered = filtered.filter(m => m.product_id === productId);
    }
    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }
    if (referenceType) {
      filtered = filtered.filter(m => m.reference_type === referenceType);
    }
    if (actorId) {
      filtered = filtered.filter(m => m.actor_id === actorId);
    }
    if (startDate) {
      filtered = filtered.filter(m => new Date(m.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(m => new Date(m.created_at) <= new Date(endDate));
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const total = filtered.length;
    const from = (p - 1) * l;
    const paginated = filtered.slice(from, from + l);

    const enriched = paginated.map(m => {
      if (!m.product_name) {
        const prod = localStore.get(`product:${m.product_id}`);
        if (prod) {
          return {
            ...m,
            product_name: prod.name,
            product_sku: prod.sku || m.product_id,
          };
        }
      }
      return m;
    });

    return {
      data: enriched,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      },
    };
  },

  // ── Suppliers (Batch 04) ──────────────────────────────────
  async createSupplier(supplierData) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplierData)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    localStore.set(`supplier:${supplierData.id}`, supplierData);
    await saveStoreToDisk();
    return supplierData;
  },

  async updateSupplier(id, updates) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const current = localStore.get(`supplier:${id}`);
    if (!current) return null;
    const updated = { ...current, ...updates };
    localStore.set(`supplier:${id}`, updated);
    await saveStoreToDisk();
    return updated;
  },

  async getSupplier(id) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }

    const found = localStore.get(`supplier:${id}`);
    if (found) return found;

    const seed = SEED_SUPPLIERS.find(s => s.id === id);
    return seed || null;
  },

  async getSuppliers(options = {}) {
    const { search, isActive, page = 1, limit = 50 } = options;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

    if (isSupabaseConfigured) {
      let query = supabase.from('suppliers').select('*', { count: 'exact' });
      if (isActive !== undefined && isActive !== '') {
        query = query.eq('is_active', isActive === 'true' || isActive === true);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      const from = (p - 1) * l;
      const to = from + l - 1;
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page: p,
          limit: l,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / l),
        }
      };
    }

    // Local store
    const list = [];
    const seenIds = new Set();
    for (const [key, val] of localStore.entries()) {
      if (key.startsWith('supplier:') && val) {
        list.push(val);
        seenIds.add(val.id);
      }
    }
    for (const s of SEED_SUPPLIERS) {
      if (!seenIds.has(s.id)) {
        list.push(s);
      }
    }

    let filtered = list;
    if (isActive !== undefined && isActive !== '') {
      const boolActive = isActive === 'true' || isActive === true;
      filtered = filtered.filter(s => Boolean(s.is_active) === boolActive);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.contact_name && s.contact_name.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = filtered.length;
    const from = (p - 1) * l;
    const paginated = filtered.slice(from, from + l);

    return {
      data: paginated,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      }
    };
  },

  async deleteSupplier(id) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      return true;
    }

    localStore.delete(`supplier:${id}`);
    await saveStoreToDisk();
    return true;
  },

  // ── Purchase Orders (Batch 04) ────────────────────────────
  async createPurchaseOrder(poData) {
    if (isSupabaseConfigured) {
      const { items, ...poFields } = poData;
      const { data: createdPo, error: poError } = await supabase
        .from('purchase_orders')
        .insert(poFields)
        .select()
        .single();
      if (poError) throw poError;

      if (items && items.length > 0) {
        const itemRows = items.map(it => ({
          ...it,
          purchase_order_id: createdPo.id,
        }));
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }

      return {
        ...createdPo,
        items: items || [],
      };
    }

    localStore.set(`purchase_order:${poData.id}`, poData);
    if (poData.items) {
      for (const it of poData.items) {
        localStore.set(`po_item:${it.id}`, { ...it, purchase_order_id: poData.id });
      }
    }
    await saveStoreToDisk();
    return poData;
  },

  async updatePurchaseOrder(id, updates) {
    if (isSupabaseConfigured) {
      const { items, ...poFields } = updates;
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(poFields)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (items) {
        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id);
        const itemRows = items.map(it => ({
          ...it,
          purchase_order_id: id,
        }));
        await supabase.from('purchase_order_items').insert(itemRows);
      }

      return {
        ...data,
        items: items || [],
      };
    }

    const current = localStore.get(`purchase_order:${id}`);
    if (!current) return null;

    const updated = { ...current, ...updates };
    localStore.set(`purchase_order:${id}`, updated);

    if (updates.items) {
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('po_item:') && val.purchase_order_id === id) {
          localStore.delete(key);
        }
      }
      for (const it of updates.items) {
        localStore.set(`po_item:${it.id}`, { ...it, purchase_order_id: id });
      }
    }

    await saveStoreToDisk();
    return updated;
  },

  async getPurchaseOrder(id) {
    if (isSupabaseConfigured) {
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .select('*, supplier:suppliers(*)')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (!po) return null;

      const { data: items } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', id);

      return {
        ...po,
        items: items || [],
      };
    }

    const po = localStore.get(`purchase_order:${id}`);
    if (!po) return null;

    let items = po.items;
    if (!items || items.length === 0) {
      items = [];
      for (const [key, val] of localStore.entries()) {
        if (key.startsWith('po_item:') && val.purchase_order_id === id) {
          items.push(val);
        }
      }
    }

    const supplier = await this.getSupplier(po.supplier_id);

    return {
      ...po,
      supplier,
      items: items || [],
    };
  },

  async getPurchaseOrders(options = {}) {
    const { supplier_id, status, search, startDate, endDate, page = 1, limit = 50 } = options;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));

    if (isSupabaseConfigured) {
      let query = supabase.from('purchase_orders').select('*, supplier:suppliers(name)', { count: 'exact' });
      if (supplier_id) query = query.eq('supplier_id', supplier_id);
      if (status) query = query.eq('status', status);
      if (search) query = query.ilike('po_number', `%${search}%`);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const from = (p - 1) * l;
      const to = from + l - 1;
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page: p,
          limit: l,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / l),
        }
      };
    }

    const list = [];
    for (const [key, val] of localStore.entries()) {
      if (key.startsWith('purchase_order:') && val) {
        list.push(val);
      }
    }

    let filtered = list;
    if (supplier_id) {
      filtered = filtered.filter(po => po.supplier_id === supplier_id);
    }
    if (status) {
      filtered = filtered.filter(po => po.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(po =>
        (po.po_number && po.po_number.toLowerCase().includes(q)) ||
        (po.supplier_name && po.supplier_name.toLowerCase().includes(q))
      );
    }
    if (startDate) {
      filtered = filtered.filter(po => new Date(po.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(po => new Date(po.created_at) <= new Date(endDate));
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = filtered.length;
    const from = (p - 1) * l;
    const paginated = filtered.slice(from, from + l);

    return {
      data: paginated,
      pagination: {
        page: p,
        limit: l,
        total,
        totalPages: Math.ceil(total / l),
      }
    };
  },

  };
