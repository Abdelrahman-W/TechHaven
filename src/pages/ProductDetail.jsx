import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  RefreshCw,
  CreditCard,
  Truck,
  Star,
  ShoppingCart,
  Zap,
  Check,
  Minus,
  Plus,
  ArrowLeft,
  Heart,
  Sparkles,
  Package,
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';

// Fallback products in case API is temporarily unavailable
const FALLBACK_PRODUCTS = [
  {
    id: 'prod-headphones',
    name: 'TechHaven Studio Pro Wireless ANC Headphones',
    name_en: 'TechHaven Studio Pro Wireless ANC Headphones',
    brand: 'TechHaven',
    model: 'Studio Pro Wireless Gen 1',
    price: 9800,
    old_price: 11500,
    rating: 4.95,
    review_count: 142,
    sold_count: 380,
    category_id: 'cat-headphones',
    badge: 'FLAGSHIP',
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
      'الميكروفونات': 'ميكروفون مزدوج مع عزل ضجيج المكالمات بالذكاء الاصطناعي AI ENC',
    },
    features: [
      'عزل نشط هجين للضوضاء يعزل 99.2% من الضجيج المحيط',
      'صوت مكاني سينمائي 360 درجة مع معالجة رقمية متطورة',
      'وسائد أذن ميموري فوم ناعمة توفر راحة فائقة لساعات طويلة',
      'توافق فوري مع جميع أجهزة الهواتف واللابتوب والكمبيوتر عبر البلوتوث 5.3',
      'أزرار تحكم لمسية وميكانيكية لضبط الصوت والرد على المكالمات بسهولة',
    ],
  },
  {
    id: 'prod-airpods',
    name: 'TechHaven AirPods Pro 2',
    name_en: 'TechHaven AirPods Pro 2 Wireless Earbuds',
    brand: 'TechHaven',
    model: 'AirPods Pro Gen 2',
    price: 8499,
    old_price: 9999,
    rating: 4.9,
    review_count: 128,
    sold_count: 310,
    category_id: 'cat-headphones',
    badge: 'NEW',
    images: ['/images/prod-airpods.jpg'],
    thumbnail: '/images/prod-airpods.jpg',
    description: 'سماعات أذن لاسلكية فائقة النقاء مع إلغاء نشط للضوضاء من الجيل الثاني، وضع شفافية متكيف، وصوت مكاني مخصص مع تتبع حركات الرأس.',
    description_en: 'Next-gen wireless earbuds with 2x Active Noise Cancellation, adaptive transparency, and personalized spatial audio.',
    specs: {
      'نوع الاتصال': 'Bluetooth 5.3',
      'عمر البطارية': 'حتى 30 ساعة مع علبة الشحن',
      'إلغاء الضوضاء': 'Active Noise Cancellation 2x مضاعف',
      'مقاومة الماء والتعرق': 'معيار IP54 المعتمد',
      'منفذ الشحن': 'USB-C و MagSafe Wireless',
      'الوزن': '5.3 جرام لكل سماعة',
      'الشريحة': 'شريحة Apple H2 الصوتية فائقة الذكاء',
      'الميكروفونات': 'ميكروفون مزدوج بتوجيه شعاعي',
    },
    features: [
      'إلغاء ضوضاء نشط مضاعف يعزل الضجيج الخارجي بنسبة 99%',
      'شريحة صوتية ذكية لمعالجة الترددات في أجزاء من الثانية',
      'صوت مكاني مخصص مع تتبع ديناميكي لحركات الرأس',
      'علبة شحن مزودة بسماعة مدمجة لتحديد المكان عبر Find My',
      'مقاومة ممتازة لرذاذ الماء والتعرق أثناء التمارين الرياضية',
    ],
  },
  {
    id: 'prod-watch',
    name: 'TH Watch Ultra Smartwatch',
    name_en: 'TH Watch Ultra Titanium Smartwatch',
    brand: 'TechHaven',
    model: 'Watch Ultra Titanium 49mm',
    price: 14999,
    old_price: 16999,
    rating: 4.8,
    review_count: 96,
    sold_count: 185,
    category_id: 'cat-smartwatches',
    badge: 'POPULAR',
    images: ['/images/prod-watch.jpg', '/images/hero-1.jpg'],
    thumbnail: '/images/prod-watch.jpg',
    description: 'ساعة ذكية رائدة بهيكل من التيتانيوم فائق الصلابة، شاشة Always-On Retina OLED ساطعة 2000 nits، ونظام ملاحة ثنائي التردد للرياضيين والمغامرين.',
    description_en: 'Rugged titanium smartwatch with precision dual-frequency GPS, up to 36h battery life, and advanced health metrics.',
    specs: {
      'مقاس الهيكل': 'Titanium 49mm مصقول',
      'نوع الشاشة': 'Always-On Retina OLED 2000 nits ساطعة',
      'عمر البطارية': 'حتى 36 ساعة استخدام عادي / 72 ساعة وضع توفير الطاقة',
      'مقاومة الماء': 'مقاومة حتى عمق 100 متر (معتمدة للغوص الترفيهي)',
      'المستشعرات': 'تخطيط القلب ECG، قياس الأكسجين SpO2، قياس درجة الحرارة',
      'الاتصال': 'GPS ثنائي التردد L1+L5 + Bluetooth 5.3 + Wi-Fi',
      'الوزن': '61.3 جرام',
      'المتانة': 'معيار عسكري MIL-STD 810H لمقاومة الصدمات',
    },
    features: [
      'هيكل تيتانيوم مصقول من فئة الطيران بصلابة استثنائية',
      'زر إجراءات برتقالي قابل للتخصيص للوصول السريع للمهام',
      'مستشعرات دقيقة لتخطيط القلب ومعدل نبضات القلب المستمر',
      'صفارة إنذار مدمجة بقوة 86 ديسيبل للمواقف الطارئة',
    ],
  },
  {
    id: 'prod-phone',
    name: 'TH Phone 15 Pro Max 256GB Titanium',
    name_en: 'TH Phone 15 Pro Max Titanium',
    brand: 'TechHaven',
    model: 'Phone 15 Pro Max 256GB',
    price: 49999,
    old_price: 54999,
    rating: 4.95,
    review_count: 240,
    sold_count: 420,
    category_id: 'cat-smartphones',
    badge: 'FLAGSHIP',
    images: ['/images/prod-phone.jpg', '/images/hero-1.jpg'],
    thumbnail: '/images/prod-phone.jpg',
    description: 'الهاتف الأقوى بمعالج جيل قادم ثوري بتقنية 3 نانومتر، هيكل تيتانيوم فائق الخفة، ونظام كاميرات احترافي بدقة 48 ميجابكسل مع تقريب بصري 5x حقيقي.',
    description_en: 'Flagship smartphone with aerospace-grade titanium design, 3nm processor, 5x optical telephoto camera, and Super Retina XDR.',
    specs: {
      'الشاشة': '6.7 بوصة Super Retina XDR OLED ProMotion 120Hz',
      'المعالج': 'Next-Gen 3nm Hexa-Core Chip الرائد',
      'سعة التخزين': '256GB NVMe فائقة السرعة',
      'الكاميرا الخلفية': '48MP رئيسية + 12MP فائقة الاتساع + 12MP بيريسكوب 5x',
      'الكاميرا الأمامية': '12MP TrueDepth مع تركيز تلقائي وسينمائي',
      'منفذ التوصيل': 'USB-C 3.0 سرعة نقل تصل لـ 10Gbps',
      'الهيكل': 'تيتانيوم Grade 5 مع زجاج Ceramic Shield المقاوم',
      'البطارية': 'تدوم طوال اليوم مع شحن سريع 50% في 30 دقيقة',
    },
    features: [
      'أخف هاتف Pro Max بتصميم التيتانيوم المريح لليد',
      'تقريب بصري حقيقي 5x بأطول بعد بؤري في الهواتف الذكية',
      'معالج رسومات متطور يشغل ألعاب الكونسول بجودة بصرية خرافية',
      'زر إجراءات Action Button متعدد الوظائف بلمسة واحدة',
    ],
  },
  {
    id: 'prod-laptop',
    name: 'TechHaven AeroBook 14 OLED',
    name_en: 'TechHaven AeroBook 14 Ultra-Thin OLED',
    brand: 'TechHaven',
    model: 'AeroBook 14 Evo Edition',
    price: 34999,
    old_price: 39999,
    rating: 4.85,
    review_count: 74,
    sold_count: 145,
    category_id: 'cat-laptops',
    badge: 'SALE',
    images: ['/images/prod-laptop.jpg', '/images/hero-2.jpg'],
    thumbnail: '/images/prod-laptop.jpg',
    description: 'لابتوب فائق الخفة والنحافة بوزن 1.2 كجم فقط، شاشة 2.8K OLED ساحرة بمعدل 120Hz، أداء استثنائي للمحترفين وصناع المحتوى، وبطارية تدوم 18 ساعة.',
    description_en: 'Ultra-portable 14-inch laptop featuring 2.8K OLED 120Hz display, all-day battery life, and aerospace aluminum chassis.',
    specs: {
      'الشاشة': '14.0 بوصة 2.8K OLED 120Hz ألوان 100% DCI-P3 سطوع 500 nits',
      'المعالج': 'Intel Core Ultra 7 مع وحدة ذكاء اصطناعي NPU مخصصة',
      'الذاكرة (RAM)': '16GB LPDDR5X فائقة السرعة 7467MHz',
      'التخزين': '1TB PCIe Gen4 NVMe SSD',
      'الوزن': '1.24 كجم وسماكة 13.9 مم فقط',
      'البطارية': '75Wh تدوم حتى 18 ساعة استخدام متواصل',
      'المنافذ': '2x Thunderbolt 4 + 1x USB-A + HDMI 2.1 + Audio Jack',
      'نظام التشغيل': 'Windows 11 Pro الأصلي مرخص',
    },
    features: [
      'شاشة OLED مذهلة بدقة 2.8K وألوان سينمائية مريحة للعين',
      'هيكل ألومنيوم ميكانيكي بالكامل بوزن ريشة وسماكة استثنائية',
      'كيبورد مضاء بإحساس هادئ ومريح ولوحة لمس زجاجية رحبة',
      'شحن سريع بتقنية GaN يمنحك 60% بطارية خلال 45 دقيقة',
    ],
  },
  {
    id: 'prod-camera',
    name: 'TH Capture X1 Mirrorless 4K',
    name_en: 'TH Capture X1 4K Cinema Camera',
    brand: 'TechHaven',
    model: 'Capture X1 Mark I',
    price: 42500,
    old_price: 46000,
    rating: 4.9,
    review_count: 53,
    sold_count: 67,
    category_id: 'cat-cameras',
    badge: 'PRO',
    images: ['/images/prod-camera.jpg', '/images/hero-3.jpg'],
    thumbnail: '/images/prod-camera.jpg',
    description: 'كاميرا بدون مرآة بمستشعر إطار كامل Full-Frame وتصوير سينمائي 4K 60fps 10-bit، مع تثبيت بصري خماسي المحاور وتركيز بؤري فائق الذكاء.',
    description_en: 'Professional mirrorless full-frame 4K camera with 5-axis IBIS, real-time eye autofocus, and 10-bit cinema video profiles.',
    specs: {
      'المستشعر': '33MP Full-Frame Back-Illuminated CMOS',
      'تصوير الفيديو': '4K 60p 10-bit 4:2:2 All-Intra بدون اقتطاع',
      'التثبيت البصري': 'تثبيت خماسي المحاور داخل الجسم 5-Axis IBIS',
      'نقاط التركيز': '759 نقطة تركيز بؤري مع ذكاء اصطناعي لتتبع العين',
      'منفذ الذاكرة': 'Dual Slot CFexpress Type A و SD UHS-II',
      'الشاشة': 'شاشة لمس متحركة بالكامل 3.0 بوصة فائقة الوضوح',
    },
    features: [
      'مستشعر إطار كامل متفوق في الإضاءة المنخفضة بدون تشويش',
      'تتبع ذكي فائق الدقة للعين والوجوه في الفيديو والصور',
      'بروفايل ألوان S-Cinetone السينمائي الجاهز للعرض المباشر',
    ],
  },
  {
    id: 'prod-speaker',
    name: 'TH SoundBoom 360 Wireless',
    name_en: 'TH SoundBoom 360 Spatial Speaker',
    brand: 'TechHaven',
    model: 'SoundBoom 360 Gen 1',
    price: 6800,
    old_price: 7900,
    rating: 4.75,
    review_count: 88,
    sold_count: 210,
    category_id: 'cat-speakers',
    badge: 'HOT',
    images: ['/images/prod-speaker.jpg'],
    thumbnail: '/images/prod-speaker.jpg',
    description: 'مكبر صوت بلوتوث أسطواني يقدم صوتاً محيطياً بزاوية 360 درجة مع بيز عميق ومضخمات صوت مزدوجة، ومقاومة كاملة للماء بمعيار IP67.',
    description_en: '360-degree immersive acoustic Bluetooth speaker with dynamic bass radiators and ambient synchronized LED halo.',
    specs: {
      'النظام الصوتي': 'توزيع صوتي محيطي 360° Omnidirectional',
      'القدرة الكهربية': '60W RMS نقي وعالي الدقة',
      'البطارية': 'حتى 20 ساعة تشغيل متواصل (8000mAh)',
      'مقاومة الماء': 'معيار IP67 للغطس الكامل ومقاومة الصدمات',
      'الاتصال': 'Bluetooth 5.3 + مدخل AUX 3.5mm',
    },
    features: [
      'توزيع صوتي كامل 360 درجة يغمر أي غرفة بصوت فائق النقاء',
      'مضخمات صوت مزدوجة لصوت بيز قوي وعميق وواضح',
      'إمكانية ربط سماعتين معاً لصوت ستيريو حقيقي True Wireless',
    ],
  },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, addToCart, setOpen } = useCart();
  const { lang, isRtl, t } = useLanguage();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('specs');
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 420) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [gallerySwipeClass, setGallerySwipeClass] = useState('');
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Available colors dynamic
  const colorOptions = product?.colors || product?.color_options || [];

  const imagesList = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    const single = product.thumbnail || product.image;
    return single ? [single] : ['/images/prod-airpods.jpg'];
  }, [product]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);

    api.getProduct(id)
      .then((res) => {
        const prod = res?.data || res?.product || res;
        if (prod && (prod.name || prod.id)) {
          applyProduct(prod);
        } else {
          fallbackSearch();
        }
      })
      .catch(() => {
        fallbackSearch();
      })
      .finally(() => {
        setLoading(false);
      });

    function applyProduct(p) {
      setProduct(p);
      const firstImg =
        (p.images && p.images[0]) ||
        p.thumbnail ||
        p.image ||
        '/images/prod-airpods.jpg';
      setActiveImage(firstImg);

      // Load related products
      api.getProducts({ category: p.category_id, limit: 4 })
        .then((r) => {
          const prods = (r?.data || r?.products || []).filter((item) => item.id !== p.id);
          setRelatedProducts(prods.length > 0 ? prods : FALLBACK_PRODUCTS.filter((f) => f.id !== p.id).slice(0, 4));
        })
        .catch(() => {
          setRelatedProducts(FALLBACK_PRODUCTS.filter((f) => f.id !== p.id).slice(0, 4));
        });
    }

    function fallbackSearch() {
      const match =
        FALLBACK_PRODUCTS.find((p) => p.id === id || p.slug === id) ||
        FALLBACK_PRODUCTS.find((p) => String(p.name).toLowerCase().includes(String(id).toLowerCase())) ||
        FALLBACK_PRODUCTS[0];

      if (match) {
        applyProduct(match);
      } else {
        setProduct(null);
      }
    }
  }, [id]);

  const handleAddToCart = (openDrawer = false) => {
    if (!product) return;
    const addFn = addItem || addToCart;
    if (addFn) {
      addFn(product, qty, openDrawer);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2200);
      toast.success(isRtl ? `تمت إضافة "${product.name}" إلى السلة` : `Added "${product.name_en || product.name}" to cart`);
      if (openDrawer && setOpen) {
        setOpen(true);
      }
    }
  };

  const handleBuyNow = () => {
    handleAddToCart(false);
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '60px 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 36, alignItems: 'start' }}>
            <div className="skeleton" style={{ height: 440, borderRadius: 'var(--radius-sm)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="skeleton" style={{ height: 26, width: '35%', borderRadius: 'var(--radius-xs)' }} />
              <div className="skeleton" style={{ height: 48, width: '85%', borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton" style={{ height: 32, width: '45%', borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton" style={{ height: 120, width: '100%', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton" style={{ height: 50, width: '100%', borderRadius: 'var(--radius-sm)' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div className="empty-state" style={{ maxWidth: 480, width: '100%' }}>
          <Package size={48} className="empty-state-icon" style={{ color: 'var(--brand-orange)', margin: '0 auto 16px' }} />
          <h2 className="empty-state-title">
            {isRtl ? 'عذراً، هذا المنتج غير متوفر' : 'Sorry, this product is unavailable'}
          </h2>
          <p className="empty-state-text">
            {isRtl
              ? 'ربما تم نقل المنتج أو الرابط غير صحيح. تفضل بتصفح تشكيلتنا الكاملة من الأجهزة الذكية.'
              : 'The product may have been moved or the link is incorrect. Please browse our hardware catalog.'}
          </p>
          <Link to="/shop" className="btn btn-th-orange" style={{ textDecoration: 'none' }}>
            <span>{isRtl ? 'تصفح كل المنتجات' : 'Browse All Products'}</span>
            <ArrowLeft size={16} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
          </Link>
        </div>
      </div>
    );
  }

  const price = product.price || 0;
  const oldPrice = product.old_price || product.oldPrice || 0;
  const savings = oldPrice > price ? oldPrice - price : 0;
  const discountPercent = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: isRtl ? product.name : (product.name_en || product.name),
    image: imagesList,
    description: isRtl ? (product.description || product.name) : (product.description_en || product.description || product.name),
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'TechHaven',
    },
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : '',
      priceCurrency: 'EGP',
      price: price,
      availability: (product.stock_qty ?? product.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'TechHaven',
      },
    },
    ...(Number(product.rating) > 0 && Number(product.review_count) > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating),
            reviewCount: Number(product.review_count),
          },
        }
      : {}),
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', padding: '24px 0 80px' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, '\\u003c') }}
      />
      <div className="container">

        {/* ── Breadcrumb Bar ───────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="th-breadcrumb">
          <Link to="/">{t('nav_home')}</Link>
          <span className="th-breadcrumb-sep">/</span>
          <Link to="/shop">{t('nav_shop')}</Link>
          {product.category_id && (
            <>
              <span className="th-breadcrumb-sep">/</span>
              <Link to={`/shop?category=${product.category_id}`}>
                {product.category_id.replace('cat-', '').toUpperCase()}
              </Link>
            </>
          )}
          <span className="th-breadcrumb-sep">/</span>
          <span className="th-breadcrumb-current">{isRtl ? product.name : (product.name_en || product.name)}</span>
        </nav>

        {/* ── Main Showcase Grid (Gallery + Specs + Buy Box) ──── */}
        <div className="th-product-detail-hero apple-scale-in">

          {/* 1. Interactive Image Gallery Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Main Stage Image */}
            <div
              onTouchStart={(e) => {
                touchStartXRef.current = e.touches[0].clientX;
                touchStartYRef.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (imagesList.length <= 1) return;
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const diffX = touchEndX - touchStartXRef.current;
                const diffY = touchEndY - touchStartYRef.current;
                if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
                  const currIdx = imagesList.findIndex(im => im === (activeImage || product.thumbnail));
                  const safeIdx = currIdx === -1 ? 0 : currIdx;
                  if (diffX > 0) {
                    const prevIdx = (safeIdx - 1 + imagesList.length) % imagesList.length;
                    setGallerySwipeClass('th-img-swipe-right');
                    setActiveImage(imagesList[prevIdx]);
                    setTimeout(() => setGallerySwipeClass(''), 350);
                  } else {
                    const nextIdx = (safeIdx + 1) % imagesList.length;
                    setGallerySwipeClass('th-img-swipe-left');
                    setActiveImage(imagesList[nextIdx]);
                    setTimeout(() => setGallerySwipeClass(''), 350);
                  }
                }
              }}
              style={{
                width: '100%',
                height: 'clamp(280px, 45vh, 420px)',
                background: 'radial-gradient(ellipse at center, #171A24 0%, #0D0E13 100%)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), var(--shadow-card)',
                touchAction: 'pan-y',
                userSelect: 'none',
              }}
            >
              {discountPercent > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 16,
                    insetInlineStart: 16,
                    background: 'var(--danger)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 'var(--text-xs)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
                    zIndex: 3,
                  }}
                >
                  {isRtl ? `خصم ${discountPercent}%` : `${discountPercent}% Off`}
                </span>
              )}

              {product.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 16,
                    insetInlineEnd: 16,
                    background: 'var(--brand-orange)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 'var(--text-xs)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-xs)',
                    zIndex: 3,
                  }}
                >
                  {product.badge}
                </span>
              )}

              <img
                key={activeImage || product.thumbnail}
                src={activeImage || product.thumbnail}
                alt={product.name}
                className={gallerySwipeClass}
                style={{
                  maxHeight: 340,
                  maxWidth: '100%',
                  objectFit: 'contain',
                  transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                  filter: 'drop-shadow(0 14px 28px rgba(0,0,0,0.6))',
                }}
              />
            </div>

            {/* Thumbnails Row */}
            {imagesList.length > 1 && (
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {imagesList.map((img, idx) => {
                  const isActive = activeImage === img;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 'var(--radius-sm)',
                        background: '#0D0E13',
                        border: isActive ? '2px solid var(--brand-orange)' : '1px solid var(--border)',
                        padding: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        outline: 'none',
                        transition: 'all var(--transition-fast)',
                        boxShadow: isActive ? '0 0 14px rgba(255,94,20,0.4)' : 'none',
                      }}
                    >
                      <img src={img} alt="" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Middle Details & Live Specs Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Brand + Model Tag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(255, 94, 20, 0.12)',
                  color: 'var(--brand-orange)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid rgba(255, 94, 20, 0.25)',
                  letterSpacing: '0.5px',
                }}
              >
                {product.brand || 'TechHaven'}
              </span>
              {product.model && (
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {t('pd_model')} {product.model}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.25,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              {isRtl ? product.name : (product.name_en || product.name)}
            </h1>

            {/* Ratings & Social Proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="var(--brand-orange)" stroke="var(--brand-orange)" />
                ))}
              </div>
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: 'var(--text-sm)' }}>
                {Number(product.rating) > 0 ? product.rating : '—'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                ({Number(product.review_count) > 0 ? product.review_count : 0} {t('pd_verified_reviews')})
              </span>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
              <span style={{ color: 'var(--success)', fontSize: 'var(--text-xs)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={13} />
                <span>{t('pd_pieces_sold')} {product.sold_count || 210}+ {t('pd_sold_suffix')}</span>
              </span>
            </div>

            {/* Color Palette Selector */}
            {colorOptions.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: 8 }}>
                {isRtl ? 'اللون:' : 'Color:'} <strong style={{ color: '#FFFFFF' }}>{colorOptions[selectedColor]?.name}</strong>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {colorOptions.map((col, idx) => {
                  const isSel = selectedColor === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(idx)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 'var(--radius-full)',
                        background: col.hex || col.color || '#000',
                        border: isSel ? '2px solid #FFFFFF' : '1px solid var(--border-strong)',
                        cursor: 'pointer',
                        boxShadow: isSel ? '0 0 0 3px var(--brand-orange)' : 'none',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={col.name}
                      aria-label={col.name}
                    />
                  );
                })}
              </div>
            </div>
            )}

            {/* Highlights Box */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                marginTop: 6,
              }}
            >
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--brand-orange)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} />
                <span>{t('pd_key_specs')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {product.specs ? (
                  Object.entries(product.specs).slice(0, 4).map(([key, val]) => (
                    <div key={key} style={{ fontSize: 'var(--text-xs)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{key}: </span>
                      <strong style={{ color: '#FFFFFF', display: 'block' }}>{val}</strong>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    {isRtl ? 'ضمان رسمي معتمد 3 سنوات مع شحن فوري.' : '3-Year certified warranty with express shipping.'}
                  </div>
                )}
              </div>
            </div>

            {/* Feature Bullets */}
            {product.features && product.features.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <ul style={{ paddingInlineStart: 18, margin: 0 }}>
                  {product.features.slice(0, 3).map((feat, i) => (
                    <li key={i} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.7, marginBottom: 4 }}>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 3. TechHaven Buy Box Card */}
          <div
            className="th-buy-box-col"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              {/* Price Display */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                    {price.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                  </span>
                  <span style={{ color: 'var(--brand-orange)', fontWeight: 800, fontSize: '1rem' }}>
                    {t('currency')}
                  </span>
                </div>
                {oldPrice > price && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                    <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: 'var(--text-sm)' }}>
                      {oldPrice.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                    </span>
                    <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 'var(--text-xs)' }}>
                      {t('save')} {savings.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                    </span>
                  </div>
                )}
              </div>

              {/* Installment Badge */}
              <div
                style={{
                  background: 'rgba(255, 94, 20, 0.08)',
                  border: '1px dashed rgba(255, 94, 20, 0.3)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '8px 12px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  marginBottom: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CreditCard size={15} style={{ color: 'var(--brand-orange)' }} />
                <span>{t('pd_installment_or')} <strong>{Math.round(price / 12).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}/{isRtl ? 'شهر' : 'mo'}</strong> {t('pd_month_no_interest')}</span>
              </div>

              {/* In Stock Badge */}
              <div style={{ marginBottom: 18 }}>
                <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                  <span>{t('pd_in_stock_express')}</span>
                </span>
                <small style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', display: 'block', marginTop: 4 }}>
                  {t('pd_order_within_hours')}
                </small>
              </div>

              {/* Quantity Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  {t('pd_quantity')}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FFFFFF',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ padding: '0 12px', fontWeight: 800, color: '#FFFFFF', minWidth: 28, textAlign: 'center' }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(Math.min(product.stock_qty || product.stock || 99, qty + 1))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FFFFFF',
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Main CTAs */}
              <button
                className="btn btn-th-orange btn-apple-tactile"
                style={{ width: '100%', padding: '13px', fontSize: 'var(--text-base)', marginBottom: 10, borderRadius: 'var(--radius-sm)' }}
                onClick={() => handleAddToCart(false)}
              >
                {isAdded ? (
                  <>
                    <Check size={18} />
                    <span>{t('pd_added')}</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span>{t('pd_add_to_cart')}</span>
                  </>
                )}
              </button>

              <button
                className="btn btn-secondary btn-apple-tactile"
                style={{ width: '100%', padding: '13px', fontSize: 'var(--text-base)', marginBottom: 10, borderRadius: 'var(--radius-sm)' }}
                onClick={handleBuyNow}
              >
                <Zap size={18} style={{ color: 'var(--brand-orange)' }} />
                <span>{t('pd_buy_now')}</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-apple-tactile"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 18,
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  color: isWishlisted ? 'var(--danger)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setIsWishlisted(!isWishlisted)}
              >
                <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
                <span>{isWishlisted ? t('pd_in_wishlist') : t('pd_save_to_wishlist')}</span>
              </button>
            </div>

            {/* Apple/Amazon Style Trust Guarantee */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>{t('pd_trust_warranty')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>{t('pd_trust_return')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>{t('pd_trust_delivery')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs Section (Specs / Description / Reviews) ─────── */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            marginBottom: 48,
          }}
        >
          {/* Tab Header Switcher */}
          <div className="th-detail-tabs-header">
            <button
              className={`btn ${activeTab === 'specs' ? 'btn-th-orange' : 'btn-ghost'}`}
              onClick={() => setActiveTab('specs')}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {t('pd_tab_specs')}
            </button>
            <button
              className={`btn ${activeTab === 'desc' ? 'btn-th-orange' : 'btn-ghost'}`}
              onClick={() => setActiveTab('desc')}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {t('pd_tab_overview')}
            </button>
            <button
              className={`btn ${activeTab === 'reviews' ? 'btn-th-orange' : 'btn-ghost'}`}
              onClick={() => setActiveTab('reviews')}
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {t('pd_tab_reviews')} ({Number(product.review_count) || 0})
            </button>
          </div>

          {/* Tab 1: Detailed Specifications Table */}
          {activeTab === 'specs' && (
            <div className="apple-slide-up">
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
                {t('pd_specs_table_title')}
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {product.specs ? (
                    Object.entries(product.specs).map(([label, val], idx) => (
                      <tr
                        key={label}
                        style={{
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 18px',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            width: '35%',
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          {label}
                        </td>
                        <td
                          style={{
                            padding: '14px 18px',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            borderBottom: '1px solid var(--border-subtle)',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          {val}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                        {isRtl ? 'مواصفات قياسية فائقة التحمل والأداء.' : 'High-durability benchmark specifications.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Full Description */}
          {activeTab === 'desc' && (
            <div className="apple-slide-up" style={{ lineHeight: 1.8, color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: '#FFFFFF', marginBottom: 14 }}>
                {t('pd_about_product')}
              </h3>
              <p style={{ marginBottom: 18 }}>{isRtl ? product.description : (product.description_en || product.description)}</p>
              {isRtl && product.description_en && (
                <p style={{ direction: 'ltr', textAlign: 'left', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {product.description_en}
                </p>
              )}
            </div>
          )}

          {/* Tab 3: Customer Reviews */}
          {activeTab === 'reviews' && (
            <div className="apple-slide-up">
              <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', padding: 24, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', minWidth: 160 }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                    {Number(product.rating) > 0 ? product.rating : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center', margin: '8px 0' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="var(--brand-orange)" stroke="var(--brand-orange)" />
                    ))}
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>{t('pd_based_on')} {Number(product.review_count) || 0} {t('pd_reviews_word')}</small>
                </div>
                <div>
                  <h4 style={{ color: '#FFFFFF', fontSize: 'var(--text-md)', marginBottom: 6 }}>
                    {t('pd_community_reviews')}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
                    {t('pd_community_recommend')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Related Products Carousel ───────────────────────── */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div className="th-section-header">
              <div className="th-section-title-wrap">
                <span className="th-orange-dash" />
                <h2 className="th-section-title">{t('pd_related_title')}</h2>
              </div>
              <Link to="/shop" className="th-view-all-link">
                <span>{isRtl ? 'تصفح المتجر' : 'Browse Shop'}</span>
                <ArrowLeft size={16} />
              </Link>
            </div>
            <div className="th-product-grid">
              {relatedProducts.slice(0, 4).map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}

        {/* ── Sticky Mobile Buy Bar (Floating for immediate purchase) ──── */}
        {showStickyBar && (
          <div className="th-mobile-sticky-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <img
                src={activeImage || product.thumbnail}
                alt={isRtl ? product.name : (product.name_en || product.name)}
                style={{
                  width: 44,
                  height: 44,
                  objectFit: 'contain',
                  background: '#14161F',
                  borderRadius: 8,
                  padding: 4,
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {isRtl ? product.name : (product.name_en || product.name)}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--brand-orange)' }}>
                  {price.toLocaleString(isRtl ? 'ar-EG' : 'en-US')} <span style={{ fontSize: '0.72rem' }}>{t('currency')}</span>
                </div>
              </div>
            </div>

            <button
              className="btn btn-th-orange btn-apple-tactile"
              onClick={() => handleAddToCart(false)}
              style={{
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                borderRadius: 8,
                boxShadow: '0 4px 14px rgba(255, 94, 20, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isAdded ? (
                <>
                  <Check size={16} />
                  <span>{t('pd_added')}</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={16} />
                  <span>{t('pd_add_to_cart')}</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
