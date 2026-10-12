import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones as HeadphonesIcon,
  Star,
  CheckCircle,
  Flame,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Gamepad2,
  Zap,
  Award,
  Cpu,
  Monitor,
  HardDrive,
  Server,
  Box,
  Layers,
  Building2,
  Wrench,
} from 'lucide-react';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';

const SLIDE_DURATION = 6000;

// ── Fallback High-Performance Hardware Data ──────────────────────
const fallbackFeatured = [
  {
    id: 'prod-gpu-4090',
    name: 'ASUS ROG Strix GeForce RTX 4090 24GB OC GDDR6X',
    name_en: 'ASUS ROG Strix GeForce RTX 4090 24GB OC GDDR6X',
    price: 98000,
    old_price: 105000,
    rating: 4.95,
    review_count: 86,
    category_id: 'cat-gpu',
    badge: 'FLAGSHIP',
    thumbnail: '/images/hero-1.jpg',
    images: ['/images/hero-1.jpg'],
    specs: { 'الذاكرة': '24GB GDDR6X', 'الواجهة': 'PCIe 4.0 x16', 'القدرة الموصى بها': '1000W' },
  },
  {
    id: 'prod-cpu-14900k',
    name: 'Intel Core i9-14900K Desktop Processor (24 Cores / 32 Threads)',
    name_en: 'Intel Core i9-14900K 24-Core Desktop Processor',
    price: 27900,
    old_price: 31000,
    rating: 4.9,
    review_count: 64,
    category_id: 'cat-cpu',
    badge: 'HOT',
    thumbnail: '/images/hero-2.jpg',
    images: ['/images/hero-2.jpg'],
    specs: { 'المقبس': 'LGA1700', 'التردد الأقصى': '6.0 GHz', 'الأنوية': '24 Cores' },
  },
  {
    id: 'prod-cpu-7800x3d',
    name: 'AMD Ryzen 7 7800X3D Gaming Processor with 3D V-Cache',
    name_en: 'AMD Ryzen 7 7800X3D Processor with 3D V-Cache',
    price: 21500,
    old_price: 23900,
    rating: 4.95,
    review_count: 112,
    category_id: 'cat-cpu',
    badge: 'BEST GAMING',
    thumbnail: '/images/hero-2.jpg',
    images: ['/images/hero-2.jpg'],
    specs: { 'المقبس': 'AM5', 'الكاش': '104MB Total Cache', 'التردد': '5.0 GHz' },
  },
  {
    id: 'prod-mb-b650',
    name: 'MSI MAG B650 TOMAHAWK WIFI Motherboard AM5',
    name_en: 'MSI MAG B650 TOMAHAWK WIFI Motherboard AM5',
    price: 11900,
    old_price: 13200,
    rating: 4.85,
    review_count: 42,
    category_id: 'cat-motherboard',
    badge: 'PRO',
    thumbnail: '/images/hero-3.jpg',
    images: ['/images/hero-3.jpg'],
    specs: { 'المقبس': 'AM5', 'الذاكرة': 'DDR5 6400+ MHz', 'الشبكة': 'Wi-Fi 6E + 2.5G LAN' },
  },
  {
    id: 'prod-ssd-990pro',
    name: 'Samsung 990 PRO 2TB NVMe M.2 PCIe 4.0 Internal SSD',
    name_en: 'Samsung 990 PRO 2TB NVMe PCIe 4.0 SSD',
    price: 9200,
    old_price: 10400,
    rating: 4.9,
    review_count: 98,
    category_id: 'cat-storage',
    badge: 'FASTEST',
    thumbnail: '/images/hero-1.jpg',
    images: ['/images/hero-1.jpg'],
    specs: { 'سرعة القراءة': '7,450 MB/s', 'سرعة الكتابة': '6,900 MB/s', 'الواجهة': 'PCIe Gen 4.0 x4' },
  },
  {
    id: 'prod-ram-ddr5',
    name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL30',
    name_en: 'Corsair Vengeance RGB 32GB DDR5 6000MHz Memory',
    price: 6800,
    old_price: 7600,
    rating: 4.8,
    review_count: 53,
    category_id: 'cat-ram',
    badge: 'POPULAR',
    thumbnail: '/images/hero-2.jpg',
    images: ['/images/hero-2.jpg'],
    specs: { 'السعة': '32GB (2x16GB)', 'التردد': '6000MHz', 'التوقيت': 'CL30' },
  },
];

// ── Hero Slides Data (Hardware Retail Focus) ──────────────────────
const heroSlides = [
  {
    id: 0,
    badge: 'ENTHUSIAST HARDWARE • OFFICIAL WARRANTY',
    titlePart1: 'ENGINEERED POWER',
    titleHighlight: 'RTX 4090 & CORE I9',
    desc: 'المستودع المعتمد لعتاد الحوسبة فائق الأداء في مصر. بطاقات الرسوميات ومعالجات الجيل الأحدث مع فحص التوافق وضمان الوكلاء المحليين المعتمدين.',
    descEn: 'Authorized high-performance computing hardware in Egypt. Latest-gen GPUs and CPUs with engineered compatibility and official warranties.',
    ctaText: 'استعراض قطع العتاد',
    ctaTextEn: 'Explore Hardware Catalog',
    ctaLink: '/shop',
    productLink: '/shop',
    categoryLink: '/shop',
    segmentTitle: 'كروت الشاشة والمعالجات',
    segmentTitleEn: 'GPUs & CPUs',
    specsPill: 'RTX 4090 • CORE I9-14900K • RYZEN 7 7800X3D',
    image: '/images/hero-1.jpg',
    accentColor: '#FF5E14',
    props: [
      { icon: ShieldCheck, title: 'ضمان الوكيل الرسمي', titleEn: 'Official Domestic Warranty', sub: 'تغطية محلية 100%', subEn: '100% Official Warranty' },
      { icon: Truck, title: 'شحن مصفح ومؤمن', titleEn: 'Insured Armored Courier', sub: 'تغليف متخصص للقطع', subEn: 'Safe specialized packaging' },
      { icon: RotateCcw, title: 'استبدال عيوب الصناعة', titleEn: '14-Day DOA Exchange', sub: 'استبدال فوري للقطع', subEn: 'Hassle-free exchange' },
      { icon: HeadphonesIcon, title: 'دعم مهندسي العتاد', titleEn: 'Hardware Engineers', sub: 'فريق استشاري متخصص', subEn: 'Hardware specialists' },
    ],
  },
  {
    id: 1,
    badge: 'CUSTOM RIG WORKBENCH',
    titlePart1: 'ZERO INCOMPATIBILITY',
    titleHighlight: 'PC BUILDER STUDIO',
    desc: 'جمّع حاسوبك المخصص مع محرك الفحص الآلي لمقبس المعالج، نوع وترددات الذاكرة DDR5، وحساب سعة مزود الطاقة PSU بدقة هندسية موثوقة.',
    descEn: 'Configure your custom build with automated socket matching, DDR5 memory topology validation, and real-time PSU wattage calculations.',
    ctaText: 'تشغيل أداة التجميع',
    ctaTextEn: 'Launch PC Builder',
    ctaLink: '/pc-builder',
    productLink: '/pc-builder',
    categoryLink: '/pc-builder',
    segmentTitle: 'تجميع الحواسيب المخصصة',
    segmentTitleEn: 'Custom PC Builds',
    specsPill: 'AM5 & LGA1700 SOCKET AUDIT • PSU TDP METER',
    image: '/images/hero-2.jpg',
    accentColor: '#FF5E14',
    props: [
      { icon: ShieldCheck, title: 'فحص المقبس الفوري', titleEn: 'Socket Match Check', sub: 'مطابقة المعالج باللوحة', subEn: 'CPU-to-MB verification' },
      { icon: Truck, title: 'تجميع واختبار شامل', titleEn: 'Full Stress Testing', sub: 'فحص الحرارة والاستقرار', subEn: 'Thermal testing verified' },
      { icon: RotateCcw, title: 'ضمان التجميعة الموحد', titleEn: 'Unified Build Warranty', sub: 'صيانة ودعم شامل للقطع', subEn: 'Complete rig coverage' },
      { icon: Zap, title: 'تسليم جاهز للتشغيل', titleEn: 'Plug & Play Ready', sub: 'إدارة كيابل وتحديث BIOS', subEn: 'Cable management & BIOS' },
    ],
  },
  {
    id: 2,
    badge: 'ENTERPRISE & B2B PROCUREMENT',
    titlePart1: 'DIRECT SUPPLY',
    titleHighlight: 'WORKSTATIONS & FLEETS',
    desc: 'تجهيز مقرات العمل والشركات ومختبرات الذكاء الاصطناعي ومقاهي الألعاب بفواتير ضريبية إلكترونية رسمية وخصومات كميات تصاعدية.',
    descEn: 'Procurement for engineering firms, AI labs, and esports centers with official ETA tax invoices and tiered volume pricing.',
    ctaText: 'بوابة الشركات B2B',
    ctaTextEn: 'B2B Enterprise Portal',
    ctaLink: '/b2b',
    productLink: '/b2b',
    categoryLink: '/b2b',
    segmentTitle: 'حلول ومبيعات الشركات',
    segmentTitleEn: 'Enterprise & B2B',
    specsPill: 'ETA ELECTRONIC TAX INVOICE • VOLUME PRICING',
    image: '/images/hero-3.jpg',
    accentColor: '#FF5E14',
    props: [
      { icon: ShieldCheck, title: 'فواتير ضريبية رسمية', titleEn: 'ETA Tax Invoices', sub: 'متوافقة مع الضرائب 100%', subEn: 'Official tax compliance' },
      { icon: Truck, title: 'توريد ودعم مخصص', titleEn: 'Dedicated Account SLA', sub: 'تسليم دفعات مجدول', subEn: 'Scheduled fleet delivery' },
      { icon: RotateCcw, title: 'تسهيلات سداد الشركات', titleEn: 'Flexible Corporate Terms', sub: 'خطط دفع معتمدة', subEn: 'Authorized payment terms' },
      { icon: Award, title: 'عقود صيانة دورية', titleEn: 'Ongoing Maintenance SLA', sub: 'ضمان استمرارية التشغيل', subEn: 'Business continuity SLA' },
    ],
  },
];

// ── Category Data (12 Native App Categories) ─────────────────────────
const categories = [
  { id: 'cat-gpu',          name: 'كروت الشاشة',     titleEn: 'Graphics Cards', path: '/shop?category=cat-gpu',          Icon: Flame },
  { id: 'cat-cpu',          name: 'المعالجات',        titleEn: 'Processors',     path: '/shop?category=cat-cpu',          Icon: Cpu },
  { id: 'cat-monitors',     name: 'الشاشات',          titleEn: 'Monitors',       path: '/shop?category=cat-monitors',     Icon: Monitor },
  { id: 'cat-gaming',       name: 'الكونسول',         titleEn: 'Consoles',       path: '/shop?category=cat-gaming',       Icon: Gamepad2 },
  { id: 'cat-ram',          name: 'الرامات',          titleEn: 'Memory',         path: '/shop?category=cat-ram',          Icon: Layers },
  { id: 'cat-storage',      name: 'التخزين والـ SSD', titleEn: 'Storage',        path: '/shop?category=cat-storage',      Icon: HardDrive },
  { id: 'cat-motherboard',  name: 'اللوحات الأم',     titleEn: 'Motherboards',   path: '/shop?category=cat-motherboard',  Icon: Layers },
  { id: 'cat-psu',          name: 'مزودات الطاقة',    titleEn: 'Power Supplies', path: '/shop?category=cat-psu',          Icon: Zap },
  { id: 'cat-case',         name: 'الكيسات والتبريد',  titleEn: 'Cases',          path: '/shop?category=cat-case',         Icon: Box },
  { id: 'cat-laptops',      name: 'اللابتوبات',       titleEn: 'Laptops',        path: '/shop?category=cat-laptops',      Icon: Laptop },
  { id: 'cat-headphones',   name: 'الإكسسوارات',      titleEn: 'Accessories',    path: '/shop?category=cat-headphones',   Icon: HeadphonesIcon },
  { id: 'cat-networking',   name: 'الشبكات والخوادم',  titleEn: 'Networking',     path: '/shop?category=cat-networking',   Icon: Server },
];

// ── Pre-built Gaming & Workstation Systems ────────────────────────
const PREBUILT_SYSTEMS = [
  {
    id: 'build-starter',
    tier: 'STARTER GAMING RIG',
    title: 'تجميعة TechHaven Starter 1080p',
    titleEn: 'TechHaven Starter 1080p Rig',
    subtitle: 'أداء فائق على دقة Full HD مع أعلى معدل إطارات في ألعاب الرياضات الإلكترونية',
    subtitleEn: 'High FPS Full HD gaming rig designed for esports titles and daily productivity',
    price: 24999,
    oldPrice: 27500,
    badge: 'الأكثر طلباً للمبتدئين',
    badgeEn: 'Best Seller For Entry Gaming',
    specs: [
      { label: 'المعالج', labelEn: 'CPU', val: 'Intel Core i5-12400F 6-Cores' },
      { label: 'كارت الشاشة', labelEn: 'GPU', val: 'NVIDIA RTX 4060 8GB OC GDDR6' },
      { label: 'اللوحة الأم', labelEn: 'Motherboard', val: 'ASUS PRIME B760M-K DDR4' },
      { label: 'الذاكرة (RAM)', labelEn: 'RAM', val: '16GB (2x8) 3200MHz Dual-Channel' },
      { label: 'التخزين', labelEn: 'Storage', val: '1TB M.2 NVMe PCIe 4.0 SSD' },
      { label: 'الباور والكيس', labelEn: 'PSU & Case', val: '650W 80+ Bronze + RGB 4-Fan Chassis' },
    ],
    highlight: 'تشغيل Valorant, Warzone, GTA V و Fortnite على Ultra 120fps+',
    highlightEn: 'Runs Valorant, Warzone, GTA V & Fortnite at 120fps+ Ultra',
  },
  {
    id: 'build-pro',
    tier: 'PRO GAMING & STREAM 2K',
    title: 'تجميعة TechHaven Beast 2K Ultra',
    titleEn: 'TechHaven Beast 2K Ultra Rig',
    subtitle: 'سلاسة فائقة 144Hz+ على دقة 2K QHD وبث مباشر واحترافي بدون أي تقطيع',
    subtitleEn: 'Ultra-smooth 144Hz+ 2K QHD gaming and seamless Twitch/YouTube live streaming',
    price: 48999,
    oldPrice: 53500,
    badge: 'الأكثر طلباً للتنافسية',
    badgeEn: 'Competitive Benchmark',
    specs: [
      { label: 'المعالج', labelEn: 'CPU', val: 'AMD Ryzen 5 7600X (Zen 4 5.3GHz)' },
      { label: 'كارت الشاشة', labelEn: 'GPU', val: 'NVIDIA RTX 4070 Super 12GB GDDR6X' },
      { label: 'اللوحة الأم', labelEn: 'Motherboard', val: 'MSI B650 Gaming Plus WiFi' },
      { label: 'الذاكرة (RAM)', labelEn: 'RAM', val: '32GB (2x16) DDR5 6000MHz RGB' },
      { label: 'التخزين', labelEn: 'Storage', val: '1TB Kingston Fury Gen4 (7000MB/s)' },
      { label: 'الباور والتبريد', labelEn: 'PSU & Cooler', val: '750W 80+ Gold + 240mm ARGB AIO Liquid' },
    ],
    highlight: 'أحدث معمارية مع دعم كامل لـ DLSS 3.5 Frame Generation وتتبع الأشعة',
    highlightEn: 'Next-gen architecture with DLSS 3.5 Frame Generation and Ray Tracing',
  },
  {
    id: 'build-extreme',
    tier: 'EXTREME WORKSTATION & 4K',
    title: 'تجميعة TechHaven Titan 4K Extreme',
    titleEn: 'TechHaven Titan 4K Extreme Beast',
    subtitle: 'وحش المونتاج والريندر 3D الثقيل والألعاب الخارقة بدقة 4K بدون أي تنازل',
    subtitleEn: 'Heavy 3D rendering, 8K video editing, and uncompromised max-settings 4K gaming',
    price: 89999,
    oldPrice: 96000,
    badge: 'القوة القصوى • NO COMPROMISE',
    badgeEn: 'Peak Power • NO COMPROMISE',
    specs: [
      { label: 'المعالج', labelEn: 'CPU', val: 'Intel Core i7-14700K 20-Cores 5.6GHz' },
      { label: 'كارت الشاشة', labelEn: 'GPU', val: 'NVIDIA RTX 4080 Super 16GB GDDR6X' },
      { label: 'اللوحة الأم', labelEn: 'Motherboard', val: 'ASUS ROG STRIX Z790-F Gaming WiFi' },
      { label: 'الذاكرة (RAM)', labelEn: 'RAM', val: '64GB (2x32) DDR5 6400MHz RGB' },
      { label: 'التخزين', labelEn: 'Storage', val: '2TB Samsung 990 PRO NVMe Gen4' },
      { label: 'الباور والتبريد', labelEn: 'PSU & Cooler', val: '850W Platinum + 360mm LCD Screen AIO' },
    ],
    highlight: 'مونتاج فيديو 8K Raw، محاكاة هندسية معقدة، وألعاب 4K على أقصى إعدادات',
    highlightEn: '8K Raw production, CAD engineering simulation, and ultra 4K gameplay',
  },
];

// ── Product Filter Tabs (Authentic Hardware Categories) ───────────
const PRODUCT_TABS = [
  { key: 'all',         label: 'الكل' },
  { key: 'gpus',        label: 'كروت الشاشة' },
  { key: 'cpus-mb',     label: 'معالجات ولوحات' },
  { key: 'ram-storage', label: 'رامات وتخزين' },
  { key: 'deals',       label: 'عروض العتاد' },
];

export default function Home() {
  const { lang, isRtl, t } = useLanguage();
  const { addItem, addToCart, setOpen } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [liveCategories, setLiveCategories] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const touchStartX = useRef(null);
  const [countdown, setCountdown] = useState({ days: 2, hours: 14, mins: 38, secs: 22 });
  const [isPaused, setIsPaused] = useState(false);

  // ── Fetch dynamic categories ──────────────────────────────────
  useEffect(() => {
    api.getCategories()
      .then((res) => {
        const cats = res.data || res.categories || [];
        if (cats.length > 0) {
          const seen = new Set();
          const uniqueCats = cats.filter((c) => {
            if (!c.id || seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
          });
          setLiveCategories(uniqueCats);
        }
      })
      .catch(() => {});
  }, []);

  // ── Hero carousel ─────────────────────────────────────────────
  const goToSlide = useCallback((index) => {
    setActiveSlide(index);
    setSlideKey((prev) => prev + 1);
  }, []);

  const nextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    setSlideKey((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setSlideKey((prev) => prev + 1);
  }, []);

  // Continuous rock-solid auto-advance (never freezes on hover or click)
  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
      setSlideKey((prev) => prev + 1);
    }, SLIDE_DURATION);
    return () => clearTimeout(timer);
  }, [activeSlide, slideKey, isPaused]);

  // Mobile touch gestures for Hero
  const handleHeroTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleHeroTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = null;
  };

  // ── Live countdown ────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.secs > 0)  return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0)  return { ...prev, mins: prev.mins - 1, secs: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        if (prev.days > 0)  return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        return { days: 0, hours: 0, mins: 0, secs: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── API Fetch ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    api.getProducts({ limit: 24 })
      .then((res) => {
        const prods = res.data || res.products || [];
        setFeaturedProducts(prods.length > 0 ? prods : fallbackFeatured);
      })
      .catch(() => setFeaturedProducts(fallbackFeatured))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtered products ─────────────────────────────────────────
  const filteredProducts = featuredProducts.filter((p) => {
    if (selectedTab === 'all')           return true;
    if (selectedTab === 'audio-phone')   return ['cat-headphones','cat-smartphones'].includes(p.category_id);
    if (selectedTab === 'watch-laptop')  return ['cat-smartwatches','cat-laptops'].includes(p.category_id);
    if (selectedTab === 'camera-speaker')return ['cat-cameras','cat-speakers'].includes(p.category_id);
    if (selectedTab === 'deals')         return (p.old_price && p.old_price > p.price) || p.badge;
    return true;
  }).slice(0, 12);

  const productTabs = [
    { key: 'all',           label: t('home_tab_all', 'الكل') },
    { key: 'audio-phone',   label: t('home_tab_audio_phone', 'سماعات وهواتف') },
    { key: 'watch-laptop',  label: t('home_tab_watch_laptop', 'ساعات ولابتوبات') },
    { key: 'camera-speaker',label: t('home_tab_camera_speaker', 'كاميرات ومكبرات') },
    { key: 'deals',         label: t('home_tab_deals', 'عروض التخفيضات') },
  ];

  return (
    <div className="th-page-enter" style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', overflowX: 'hidden' }}>

      {/* ════════════════════════════════════════════════════════════
          1. HERO SECTION — Apple-Grade Commercial Carousel
          ════════════════════════════════════════════════════════════ */}
      <section
        className="th-hero-section"
        onTouchStart={(e) => { handleHeroTouchStart(e); setIsPaused(true); }}
        onTouchEnd={(e) => { handleHeroTouchEnd(e); setIsPaused(false); }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="container">
          <div className="th-hero-grid">

            {/* ── Left: Content Column ───────────────────────── */}
            <div className="th-hero-content-col">
              {heroSlides.map((slide, idx) => {
                const isCurrent = activeSlide === idx;
                return (
                  <div
                    key={slide.id}
                    style={{
                      position: idx === 0 ? 'relative' : 'absolute',
                      top: 0, left: 0, right: 0,
                      opacity: isCurrent ? 1 : 0,
                      transform: isCurrent ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.985)',
                      transition: 'opacity 0.65s cubic-bezier(0.25,1,0.5,1), transform 0.65s cubic-bezier(0.25,1,0.5,1)',
                      pointerEvents: isCurrent ? 'auto' : 'none',
                      zIndex: isCurrent ? 2 : 1,
                    }}
                  >
                    {/* Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                      <span style={{
                        fontSize: 'var(--text-xs)',
                        fontWeight: 800,
                        background: 'rgba(255, 94, 20, 0.12)',
                        color: 'var(--brand-orange)',
                        border: '1px solid rgba(255, 94, 20, 0.3)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-xs)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}>
                        {slide.badge}
                      </span>
                    </div>

                    {/* Headline */}
                    <h1 className="th-hero-headline" style={{ margin: '0 0 18px' }}>
                      <Link
                        to={slide.productLink || slide.ctaLink}
                        style={{ color: 'inherit', textDecoration: 'none', display: 'inline' }}
                      >
                        {slide.titlePart1}<br />
                        <span style={{ color: 'var(--brand-orange)' }}>{slide.titleHighlight}</span>
                      </Link>
                    </h1>

                    {/* Description */}
                    <p className="th-hero-desc">
                      {isRtl ? slide.desc : (slide.descEn || slide.desc)}
                    </p>

                    {/* 4 Micro Props */}
                    <div className="th-hero-props-grid">
                      {slide.props.map((prop, i) => {
                        const IconComp = prop.icon;
                        return (
                          <div key={i} className="th-prop-item">
                            <div style={{
                              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                              background: 'rgba(255, 94, 20, 0.1)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'var(--brand-orange)', flexShrink: 0,
                            }}>
                              <IconComp size={18} />
                            </div>
                            <div>
                              <div className="th-prop-title">{isRtl ? prop.title : (prop.titleEn || prop.title)}</div>
                              <div className="th-prop-sub">{isRtl ? prop.sub : (prop.subEn || prop.sub)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA + Nav Arrows */}
                    <div className="th-hero-cta-wrap">
                      <Link
                        to={slide.productLink || slide.ctaLink}
                        className="btn-th-orange btn-apple-tactile"
                        style={{
                          padding: '13px 28px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 800,
                          fontSize: 'var(--text-base)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          boxShadow: 'var(--shadow-orange)',
                        }}
                      >
                        <span>{isRtl ? slide.ctaText : (slide.ctaTextEn || slide.ctaText)}</span>
                        <ArrowLeft size={18} style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
                      </Link>

                      <Link
                        to={slide.categoryLink || '/shop'}
                        style={{
                          padding: '12px 18px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          fontSize: 'var(--text-sm)',
                          color: 'var(--text-muted)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 94, 20, 0.4)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.background = 'rgba(255, 94, 20, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                          e.currentTarget.style.color = 'var(--text-muted)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        }}
                      >
                        <span>تصفح الفئة</span>
                      </Link>

                      <div style={{ display: 'flex', gap: 6 }}>
                        {[prevSlide, nextSlide].map((fn, i) => (
                          <button
                            key={i}
                            onClick={fn}
                            style={{
                              width: 40, height: 40,
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: 'var(--text-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            aria-label={i === 0 ? 'Previous slide' : 'Next slide'}
                          >
                            {i === 0 ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Segment Progress Tabs */}
              <div className="th-hero-segments-wrap">
                {heroSlides.map((s, idx) => {
                  const isCurrent = activeSlide === idx;
                  const isPast = idx < activeSlide;
                  return (
                    <button
                      key={s.id}
                      onClick={() => goToSlide(idx)}
                      className={`th-hero-segment-btn ${isCurrent ? 'active' : ''}`}
                      aria-label={s.segmentTitle}
                    >
                      <div className="th-hero-progress-track">
                        <div
                          key={isCurrent ? `${idx}-${slideKey}` : `static-${idx}`}
                          className={`th-hero-progress-bar ${
                            isCurrent ? 'running' : isPast ? 'completed' : ''
                          }`}
                        />
                      </div>
                      <span className="th-hero-segment-label">
                        {s.segmentTitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Right: Product Showcase ────────────────────── */}
            <div className="th-hero-img-col">
              {heroSlides.map((slide, idx) => {
                const isCurrent = activeSlide === idx;
                return (
                  <div
                    key={slide.id}
                    style={{
                      position: idx === 0 ? 'relative' : 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: isCurrent ? 1 : 0,
                      transform: isCurrent ? 'scale(1) translateY(0)' : 'scale(1.025) translateY(8px)',
                      transition: 'opacity 0.7s cubic-bezier(0.25,1,0.5,1), transform 0.7s cubic-bezier(0.25,1,0.5,1)',
                      pointerEvents: isCurrent ? 'auto' : 'none',
                      zIndex: isCurrent ? 2 : 1,
                    }}
                  >
                    <Link
                      to={slide.productLink || slide.ctaLink}
                      className="th-hero-product-stage-link"
                      aria-label={`عرض تفاصيل ${slide.titleHighlight || 'المنتج'}`}
                    >
                      {/* Image Frame */}
                      <div className="th-hero-product-frame">
                        {/* Orange glow overlay */}
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 1,
                          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,94,20,0.06) 0%, transparent 70%)',
                          pointerEvents: 'none',
                        }} />

                        {/* Floating Clickable Badge */}
                        <div className="th-hero-click-hint">
                          <span>عرض تفاصيل المنتج</span>
                          <ArrowLeft size={13} />
                        </div>

                        <img
                          src={slide.image}
                          alt={slide.titleHighlight}
                        />
                      </div>

                      {/* Specs Pill */}
                      <div className="th-hero-specs-pill">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-orange)', flexShrink: 0 }} />
                        <span>{slide.specsPill}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          2. TRUST STRIP — Social Proof Bar
          ════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '20px 0',
      }}>
        <div className="container">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 40, flexWrap: 'wrap', rowGap: 14,
          }}>
            {[
              { icon: ShieldCheck, label: isRtl ? 'ضمان الوكيل الرسمي 3 سنوات' : '3-Year Official Agent Warranty' },
              { icon: Truck,       label: isRtl ? 'شحن مجاني للطلبات فوق ٢٠٠٠ ج.م' : 'Free Shipping Over 2,000 EGP' },
              { icon: RotateCcw,  label: isRtl ? 'استرجاع مجاني خلال 14 يوم' : '14-Day Free Returns' },
              { icon: Award,       label: isRtl ? '+٣٨٠٠ عميل راضٍ' : '3,800+ Verified Customers' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600,
              }}>
                <Icon size={16} style={{ color: 'var(--brand-orange)', flexShrink: 0 }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          3. FLASH DEALS — Urgent Countdown Offer Bar
          ════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '40px 0 20px' }}>
        <div className="container">
          <div className="th-deal-banner">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="th-deal-label">
                <Flame size={16} />
                <span>{t('home_deals_badge', 'عروض حصرية محدودة بوقت • FLASH DEALS')}</span>
              </div>
              <h2 className="th-deal-title">
                {isRtl ? (
                  <>وفر حتى <span>35%</span> على أحدث عتاد الجيل الجديد</>
                ) : (
                  <>Save up to <span>35%</span> on Next-Gen Hardware</>
                )}
              </h2>
              <p className="th-deal-sub">
                {isRtl
                  ? 'اقتنص أقوى الخصومات على كروت الشاشة، اللابتوبات، وأحدث الأجهزة الذكية قبل انتهاء الوقت. الكمية محدودة وضمان الوكيل معتمد 3 سنوات مع شحن فوري.'
                  : 'Seize huge discounts on GPUs, gaming laptops, and flagship gear before time runs out. Limited stock with 3-year warranty and express dispatch.'}
              </p>

              {countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0 && countdown.secs === 0 ? (
                <div style={{ color: 'var(--danger)', fontSize: '1.5rem', fontWeight: 'bold', margin: '20px 0' }}>
                  {t('home_deals_ended', 'انتهى العرض')}
                </div>
              ) : (
                <div className="th-countdown-row">
                  {[
                    { val: countdown.days,  unit: t('home_deals_days', 'أيام') },
                    { val: countdown.hours, unit: t('home_deals_hours', 'ساعات') },
                    { val: countdown.mins,  unit: t('home_deals_mins', 'دقائق') },
                    { val: countdown.secs,  unit: t('home_deals_secs', 'ثواني') },
                  ].map(({ val, unit }, i) => (
                    <div key={i} className="th-time-box">
                      <span className="th-time-val">{String(val).padStart(2, '0')}</span>
                      <span className="th-time-unit">{unit}</span>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to="/shop?featured=true"
                className="btn-th-orange btn-apple-tactile"
                style={{
                  padding: '13px 30px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 'var(--text-base)',
                  boxShadow: 'var(--shadow-orange)',
                }}
              >
                <span>{isRtl ? 'تسوق كل عروض اليوم الحصرية' : 'Shop Today\'s Flash Deals'}</span>
                {isRtl ? <ArrowLeft size={18} /> : <ChevronRight size={18} />}
              </Link>
            </div>

            <div className="th-deal-img-box" style={{ position: 'relative', zIndex: 1 }}>
              <img
                src="/images/deal-banner.jpg"
                alt="عروض حصرية"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  maxWidth: '100%',
                  height: 'auto',
                  objectFit: 'contain',
                  boxShadow: '0 24px 56px rgba(0,0,0,0.75)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          4. CATEGORIES — Live & Native Grid
          ════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '30px 0 40px' }}>
        <div className="container">
          <div className="th-section-header">
            <div className="th-section-title-wrap">
              <span className="th-orange-dash" />
              <h2 className="th-section-title">{t('home_categories_title', 'تسوق حسب القسم')}</h2>
            </div>
            <Link to="/shop" className="th-view-all-link">
              <span>{isRtl ? 'عرض كل الأقسام' : 'View All Categories'}</span>
              {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          </div>

          <div className="th-categories-native-grid">
            {(liveCategories.length > 0 ? liveCategories : categories).map((cat) => {
              const catPath = cat.path || `/shop?category=${cat.id || cat.slug}`;
              const displayName = (lang === 'en' && (cat.name_en || cat.titleEn))
                ? (cat.name_en || cat.titleEn)
                : (cat.name || cat.title);
              return (
                <Link key={cat.id || cat.slug} to={catPath} className="th-native-cat-card th-touch-haptic">
                  <div className="th-native-cat-icon">
                    {cat.Icon ? <cat.Icon size={22} /> : <Cpu size={22} />}
                  </div>
                  <div className="th-native-cat-name">{displayName}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          5. PC BUILDER CALLOUT BANNER — Next-Gen Rig Configurator
          ════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '10px 0 50px' }}>
        <div className="container">
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderLeft: isRtl ? '1px solid var(--border-default)' : '3px solid var(--brand-orange)',
              borderRight: isRtl ? '3px solid var(--brand-orange)' : '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '32px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 28,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ maxWidth: 640, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,94,20,0.1)', border: '1px solid rgba(255,94,20,0.3)', borderRadius: 'var(--radius-xs)', padding: '3px 10px', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--brand-orange)', marginBottom: 14 }}>
                <Cpu size={14} />
                <span>{t('home_pcbuilder_banner_badge', 'محرك التوافق الذكي')} • COMPATIBILITY ENGINE</span>
              </div>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 12px', lineHeight: 1.3 }}>
                {isRtl ? (
                  <>ابنِ جهاز أحلامك خطوة بخطوة مع <span style={{ color: 'var(--brand-orange)' }}>فحص التوافق وحاسبة الطاقة</span></>
                ) : (
                  <>Build Your Dream PC With <span style={{ color: 'var(--brand-orange)' }}>Smart Compatibility & Power Calc</span></>
                )}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.7, margin: '0 0 20px' }}>
                {isRtl
                  ? 'اختر المعالج، كارت الشاشة، اللوحة الأم، والرامات مع فحص أوتوماتيكي فوري للتوافق وحساب دقيق لاستهلاك الطاقة (TDP). نجمع لك الجهاز باحترافية ونختبره تحت أقصى ضغط ونوصله لباب بيتك مجاناً.'
                  : 'Select your CPU, GPU, motherboard, and RAM with real-time automatic socket compatibility verification and wattage calculation. Assembled and stress-tested with free delivery.'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                  <CheckCircle size={15} style={{ color: '#10B981' }} />
                  <span>{isRtl ? 'فحص توافق السوكيت والمقاس' : 'Socket & Dimension Check'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                  <CheckCircle size={15} style={{ color: '#10B981' }} />
                  <span>{isRtl ? 'حاسبة واط تقديرية للباور' : 'Estimated Wattage & TDP'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', fontSize: 'var(--text-xs)', fontWeight: 700 }}>
                  <CheckCircle size={15} style={{ color: '#10B981' }} />
                  <span>{isRtl ? 'تجميع وكيبل مانجمنت مجاناً' : 'Free Assembly & Cable Routing'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link
                  to="/pc-builder"
                  className="btn-th-orange btn-apple-tactile"
                  style={{
                    padding: '13px 30px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 'var(--text-base)',
                    boxShadow: 'var(--shadow-orange)',
                  }}
                >
                  <Cpu size={18} />
                  <span>{isRtl ? 'ابدأ تجميع جهازك الآن' : 'Start PC Build Now'}</span>
                  {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
                </Link>
                <a
                  href="#prebuilt-systems"
                  style={{
                    padding: '12px 20px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    background: 'rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <span>{isRtl ? 'استعرض التجميعات الجاهزة' : 'Explore Pre-builts'}</span>
                </a>
              </div>
            </div>

            {/* Quick Spec Mock Frame */}
            <div
              style={{
                background: '#0D0E13',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '20px',
                minWidth: 280,
                flex: '1 1 280px',
                maxWidth: 340,
                boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12, marginBottom: 12 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                  {isRtl ? 'مثال لتجميعة متوافقة' : 'Sample Compatible Rig'}
                </span>
                <span style={{ fontSize: '0.72rem', background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontWeight: 800 }}>
                  {isRtl ? 'متوافق 100%' : '100% Compatible'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>{isRtl ? 'المعالج:' : 'Processor:'}</span>
                  <strong style={{ color: '#fff' }}>Ryzen 5 7600X</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>{isRtl ? 'كارت الشاشة:' : 'Graphics Card:'}</span>
                  <strong style={{ color: 'var(--brand-orange)' }}>RTX 4070 Super</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>{isRtl ? 'المازربورد:' : 'Motherboard:'}</span>
                  <strong style={{ color: '#fff' }}>MSI B650 WiFi</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>{isRtl ? 'الرامات:' : 'RAM Memory:'}</span>
                  <strong style={{ color: '#fff' }}>32GB DDR5 6000MHz</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{isRtl ? 'الطاقة التقديرية (TDP):' : 'Estimated Power (TDP):'}</span>
                  <strong style={{ color: '#10B981' }}>{isRtl ? '~445W (ينصح بـ 650W+)' : '~445W (650W+ Rec)'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          6. PRE-BUILT GAMING & WORKSTATION SYSTEMS
          ════════════════════════════════════════════════════════════ */}
      <section id="prebuilt-systems" style={{ padding: '10px 0 60px' }}>
        <div className="container">
          <div className="th-section-header">
            <div className="th-section-title-wrap">
              <span className="th-orange-dash" />
              <div>
                <h2 className="th-section-title">
                  {isRtl ? 'تجميعات TechHaven الجاهزة للألعاب والإنتاج' : 'Pre-built Gaming & Production Rigs'}
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
                  {isRtl ? 'أجهزة مجهزة ومختبرة بأحدث معايير الأداء مع ضمان شامل وتوصيل فوري جاهزة للتشغيل' : 'Engineered, stress-tested, and ready for extreme workloads with 3-year warranty'}
                </div>
              </div>
            </div>
            <Link to="/pc-builder" className="th-view-all-link">
              <span>{isRtl ? 'تخصيص تجميعة خاصة بك' : 'Custom Rig Configurator'}</span>
              {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {PREBUILT_SYSTEMS.map((system) => (
              <div
                key={system.id}
                className="card card-hover"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-card)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 900, color: 'var(--brand-orange)', background: 'rgba(255,94,20,0.12)', padding: '4px 10px', borderRadius: 4, letterSpacing: '0.5px' }}>
                      {system.tier}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981' }}>
                      {isRtl ? system.badge : (system.badgeEn || system.badge)}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
                    {isRtl ? system.title : (system.titleEn || system.title)}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', lineHeight: 1.6, margin: '0 0 16px' }}>
                    {isRtl ? system.subtitle : (system.subtitleEn || system.subtitle)}
                  </p>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {isRtl ? 'المواصفات الأساسية:' : 'Key Specifications:'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {system.specs.map((sp, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{isRtl ? sp.label : (sp.labelEn || sp.label)}:</span>
                          <strong style={{ color: '#FFFFFF', textAlign: 'left', direction: 'ltr' }}>{sp.val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 10px', borderRadius: 6, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} />
                    <span>{isRtl ? system.highlight : (system.highlightEn || system.highlight)}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF' }}>
                          {lang === 'en' ? system.price.toLocaleString('en-US') : system.price.toLocaleString('ar-EG')}
                        </span>
                        <span style={{ color: 'var(--brand-orange)', fontWeight: 800, fontSize: '0.88rem' }}>
                          {lang === 'en' ? 'EGP' : 'ج.م'}
                        </span>
                      </div>
                      {system.oldPrice > system.price && (
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                          {lang === 'en' ? `${system.oldPrice.toLocaleString('en-US')} EGP` : `${system.oldPrice.toLocaleString('ar-EG')} ج.م`}
                        </span>
                      )}
                    </div>

                    <Link
                      to="/pc-builder"
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Wrench size={13} />
                      <span>{isRtl ? 'تعديل في الـ Builder' : 'Customize in Builder'}</span>
                    </Link>
                  </div>

                  <button
                    onClick={() => {
                      const addFn = addItem || addToCart;
                      addFn({
                        id: system.id,
                        name: system.title,
                        price: system.price,
                        image: '/images/prod-laptop.jpg',
                        thumbnail: '/images/prod-laptop.jpg',
                        quantity: 1,
                      });
                      if (setOpen) setOpen(true);
                    }}
                    className="btn btn-th-orange btn-apple-tactile"
                    style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '0.9rem' }}
                  >
                    <span>{isRtl ? 'طلب التجميعة مع شحن مجاني' : 'Order Rig (Free Shipping)'}</span>
                    {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          7. FEATURED PRODUCTS — Segmented Tab Grid
          ════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '20px 0 60px' }}>
        <div className="container">
          <div className="th-section-header" style={{ flexWrap: 'wrap', rowGap: 14 }}>
            <div className="th-section-title-wrap">
              <span className="th-orange-dash" />
              <h2 className="th-section-title">{t('home_featured_title', 'المنتجات المميزة والأكثر طلباً')}</h2>
            </div>

            {/* Tab Switcher */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--bg-secondary)',
              padding: 4, borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border)',
              overflowX: 'auto', scrollbarWidth: 'none',
              maxWidth: '100%',
              minWidth: 0,
            }}>
              {productTabs.map((tab) => {
                const isActive = selectedTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    style={{
                      background: isActive ? 'var(--brand-orange)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-xs)',
                      padding: '6px 16px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <Link to="/shop" className="th-view-all-link">
              <span>{isRtl ? 'المتجر كاملاً' : 'Full Store'}</span>
              {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          </div>

          {loading ? (
            <div className="th-product-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 320, borderRadius: 12 }} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div key={selectedTab} className="th-product-grid apple-slide-up">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">
                {isRtl ? 'لا توجد منتجات في هذا القسم حالياً' : 'No products found in this category'}
              </div>
              <div className="empty-state-text">
                {isRtl ? 'جرّب قسماً آخر أو تصفح المتجر كاملاً' : 'Try another filter or browse our entire catalog'}
              </div>
              <Link to="/shop" className="btn-th-orange" style={{ display: 'inline-flex', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-sm)', fontWeight: 800, textDecoration: 'none', marginTop: 8 }}>
                <span>{isRtl ? 'تصفح المتجر' : 'Browse Store'}</span>
                {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          8. B2B SOLUTIONS STRIP — Corporate & Gaming Cafes
          ════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '0 0 60px' }}>
        <div className="container">
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderLeft: isRtl ? '1px solid var(--border-default)' : '3px solid #38BDF8',
              borderRight: isRtl ? '3px solid #38BDF8' : '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              padding: '32px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#38BDF8', fontSize: 'var(--text-xs)', fontWeight: 800, marginBottom: 8 }}>
                <Building2 size={16} />
                <span>{isRtl ? 'حلول ومبيعات الشركات والجملة • B2B CORPORATE' : 'Enterprise Solutions & Procurement • B2B'}</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px' }}>
                {isRtl ? 'تجهيز مقرات العمل، المعامل الهندسية، والسيبرات بأفضل أسعار الجملة' : 'Workstations, AI Server Fleets, and Office Procurement at Volume Rates'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', margin: 0, maxWidth: 600, lineHeight: 1.6 }}>
                {isRtl ? 'فواتير ضريبية رسمية، خطط دفع مرنة، خصومات كميات تصاعدية، ودعم فني مخصص مع مدير حساب خاص لشركتك.' : 'Official ETA electronic tax invoices, volume tier discounts, dedicated SLA, and key account management.'}
              </p>
            </div>
            <Link
              to="/b2b"
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38BDF8',
                padding: '12px 24px',
                borderRadius: 'var(--radius-xs)',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 'var(--text-sm)',
              }}
            >
              <span>{isRtl ? 'طلب عرض سعر لشركتك' : 'Request Corporate Quote'}</span>
              {isRtl ? <ArrowLeft size={16} /> : <ChevronRight size={16} />}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
