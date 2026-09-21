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

// ── Fallback Product Data ─────────────────────────────────────────
const fallbackFeatured = [
  {
    id: 'prod-headphones',
    name: 'TechHaven Studio Pro Wireless ANC',
    price: 9800,
    old_price: 11500,
    rating: 4.95,
    review_count: 142,
    category_id: 'cat-headphones',
    badge: 'FLAGSHIP',
    thumbnail: '/images/prod-headphones.jpg',
    images: ['/images/prod-headphones.jpg', '/images/hero-1.jpg'],
    specs: { 'نوع الاتصال': 'Bluetooth 5.3 + AUX', 'إلغاء الضوضاء': 'Hybrid ANC 4-Mic' },
  },
  {
    id: 'prod-airpods',
    name: 'TechHaven AirPods Pro 2',
    price: 8499,
    old_price: 9999,
    rating: 4.9,
    review_count: 128,
    category_id: 'cat-headphones',
    badge: 'NEW',
    thumbnail: '/images/prod-airpods.jpg',
    images: ['/images/prod-airpods.jpg'],
    specs: { 'نوع الاتصال': 'Bluetooth 5.3', 'إلغاء الضوضاء': '2x Active Noise Cancellation' },
  },
  {
    id: 'prod-watch',
    name: 'TH Watch Ultra Smartwatch',
    price: 14999,
    old_price: 16999,
    rating: 4.8,
    review_count: 96,
    category_id: 'cat-smartwatches',
    badge: 'POPULAR',
    thumbnail: '/images/prod-watch.jpg',
    images: ['/images/prod-watch.jpg'],
    specs: { 'الهيكل': 'Titanium 49mm', 'الشاشة': 'Always-On Retina OLED' },
  },
  {
    id: 'prod-phone',
    name: 'TH Phone 15 Pro Max 256GB Titanium',
    price: 49999,
    old_price: 54999,
    rating: 4.95,
    review_count: 240,
    category_id: 'cat-smartphones',
    badge: 'FLAGSHIP',
    thumbnail: '/images/prod-phone.jpg',
    images: ['/images/prod-phone.jpg'],
    specs: { 'الشاشة': '6.7" OLED 120Hz', 'الكاميرا': '48MP 5x Optical' },
  },
  {
    id: 'prod-laptop',
    name: 'TechHaven AeroBook 14 OLED',
    price: 34999,
    old_price: 39999,
    rating: 4.85,
    review_count: 74,
    category_id: 'cat-laptops',
    badge: 'SALE',
    thumbnail: '/images/prod-laptop.jpg',
    images: ['/images/prod-laptop.jpg'],
    specs: { 'الشاشة': '14.0" 2.8K OLED', 'الوزن': '1.24 kg' },
  },
  {
    id: 'prod-camera',
    name: 'TH Capture X1 Mirrorless 4K',
    price: 42500,
    old_price: 46000,
    rating: 4.9,
    review_count: 53,
    category_id: 'cat-cameras',
    badge: 'PRO',
    thumbnail: '/images/prod-camera.jpg',
    images: ['/images/prod-camera.jpg'],
    specs: { 'المستشعر': '33MP Full-Frame', 'الفيديو': '4K 60p 10-bit' },
  },
  {
    id: 'prod-speaker',
    name: 'TH SoundBoom 360 Wireless',
    price: 6800,
    old_price: 7900,
    rating: 4.75,
    review_count: 88,
    category_id: 'cat-speakers',
    badge: 'HOT',
    thumbnail: '/images/prod-speaker.jpg',
    images: ['/images/prod-speaker.jpg'],
    specs: { 'الصوت': '360° Omnidirectional', 'القدرة': '60W RMS' },
  },
];

// ── Hero Slides Data ──────────────────────────────────────────────
const heroSlides = [
  {
    id: 0,
    badge: 'SMARTER TECH. BETTER LIFE.',
    titlePart1: 'UPGRADE TO',
    titleHighlight: 'NEXT GEN',
    desc: 'اكتشف سماعات TechHaven Studio Pro اللاسلكية الاحترافية والجيل القادم من العتاد الذكي. أداء فائق وتصميم استثنائي مع ضمان رسمي وشحن فوري.',
    descEn: 'Discover TechHaven Studio Pro wireless headphones and the next generation of smart hardware. Elite performance with official certified warranty.',
    ctaText: 'عرض تفاصيل المنتج',
    ctaTextEn: 'View Product Details',
    ctaLink: '/product/prod-headphones',
    productLink: '/product/prod-headphones',
    categoryLink: '/shop?category=cat-headphones',
    segmentTitle: 'السماعات والهواتف',
    segmentTitleEn: 'Audio & Mobile',
    specsPill: 'TECHHAVEN STUDIO PRO • TH WATCH ULTRA • TITANIUM 15PM',
    image: '/images/hero-1.jpg',
    accentColor: '#FF5E14',
    props: [
      { icon: ShieldCheck, title: 'جودة فائقة معتمدة', titleEn: 'Certified Quality', sub: 'ضمان الوكيل الرسمي 100%', subEn: '100% Official Warranty' },
      { icon: Truck,        title: 'شحن سريع ومجاني',    titleEn: 'Fast Express Delivery', sub: 'توصيل خلال 24 ساعة', subEn: 'Nationwide in 24-48h' },
      { icon: RotateCcw,   title: 'استرجاع سهل',         titleEn: 'Easy 14-Day Returns', sub: '14 يوماً استبدال فوري', subEn: 'Hassle-free exchange' },
      { icon: HeadphonesIcon, title: 'دعم فني 24/7',    titleEn: '24/7 Tech Support', sub: 'فريق متخصص دائماً', subEn: 'Hardware specialists' },
    ],
  },
  {
    id: 1,
    badge: 'ULTRA-PORTABLE COMPUTING',
    titlePart1: 'ENGINEERED FOR',
    titleHighlight: 'PEAK SPEED',
    desc: 'لابتوب AeroBook 14 بشاشة 2.8K OLED ووزن 1.2 كجم فقط — أداء فائق للمحترفين والمبدعين مع بطارية تدوم 18 ساعة.',
    descEn: 'AeroBook 14 with 2.8K OLED display and weighing only 1.2 kg — extreme performance for creators with 18-hour battery endurance.',
    ctaText: 'عرض تفاصيل المنتج',
    ctaTextEn: 'View Product Details',
    ctaLink: '/product/prod-laptop',
    productLink: '/product/prod-laptop',
    categoryLink: '/shop?category=cat-laptops',
    segmentTitle: 'أجهزة وألعاب',
    segmentTitleEn: 'Laptops & Gear',
    specsPill: 'AEROBOOK 14 OLED • TH ELITE CONTROLLER',
    image: '/images/hero-2.jpg',
    accentColor: '#FF5E14',
    props: [
      { icon: ShieldCheck, title: 'شاشات OLED فائقة', titleEn: 'Stunning OLED Panels', sub: 'ألوان حقيقية معتمدة 100%', subEn: '100% DCI-P3 Color' },
      { icon: Truck,       title: 'شحن آمن ومصفح',     titleEn: 'Insured Armored Courier', sub: 'تغليف متخصص للأجهزة', subEn: 'Safe multi-layer packaging' },
      { icon: RotateCcw,  title: 'ضمان محلي شامل',     titleEn: 'Comprehensive Warranty', sub: 'صيانة وقطع أصلية', subEn: 'Genuine parts & repair' },
      { icon: Zap,         title: 'تهيئة احترافية',    titleEn: 'Pro Out-of-Box Setup', sub: 'استلم جهازك جاهزاً', subEn: 'Pre-tested & tuned' },
    ],
  },
  {
    id: 2,
    badge: 'CINEMATIC 4K CAPTURE',
    titlePart1: 'CAPTURE EVERY',
    titleHighlight: 'MOMENT IN 4K',
    desc: 'كاميرات بدون مرآة بمستشعر Full Frame وطائرات درونز فائقة الخفة بدقة 4K — صور وفيديو سينمائي لا يُنسى.',
    descEn: 'Full-frame mirrorless cameras and ultralight 4K drones — capture unforgettable cinematic photos and footage.',
    ctaText: 'عرض تفاصيل المنتج',
    ctaTextEn: 'View Product Details',
    ctaLink: '/product/prod-camera',
    productLink: '/product/prod-camera',
    categoryLink: '/shop?category=cat-cameras',
    segmentTitle: 'كاميرات ودرونز',
    segmentTitleEn: 'Cameras & Drones',
    specsPill: 'CAPTURE X1 4K CINE • SKYMASTER 4K DRONE',
    image: '/images/hero-3.jpg',
    accentColor: '#FF5E14',
    props: [
      { icon: ShieldCheck, title: 'مستشعرات Full Frame', titleEn: 'Full Frame Sensors', sub: 'دقة سينمائية احترافية', subEn: 'Cinematic precision' },
      { icon: Truck,       title: 'توصيل لجميع المحافظات', titleEn: 'All Governorates Delivery', sub: 'شحن مؤمن بالكامل', subEn: 'Fully insured shipping' },
      { icon: RotateCcw,  title: 'فحص قبل الاستلام',      titleEn: 'Inspect Before Accepting', sub: 'ثقة تامة في الجودة', subEn: 'Full peace of mind' },
      { icon: Award,       title: 'ضمان عالمي معتمد',     titleEn: 'Certified Global Warranty', sub: '2 سنة ضمان رسمي', subEn: '2-year official coverage' },
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

// ── Testimonials ──────────────────────────────────────────────────
const testimonials = [
  {
    id: 1,
    quote: 'سماعات AirPods Pro 2 غيرت تجربتي تماماً. عزل الضوضاء النشط مذهل والبطارية تكفي طوال اليوم. التوصيل في أقل من 24 ساعة!',
    quoteEn: 'AirPods Pro 2 completely changed my daily workflow. ANC is superb and the battery lasts all day. Delivered in under 24 hours!',
    name: 'أحمد سامي',
    nameEn: 'Ahmed Samy',
    city: 'القاهرة',
    cityEn: 'Cairo',
    product: 'AirPods Pro 2',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    quote: 'ساعة TH Watch Ultra بتصميم التيتانيوم خرافية! دقة تتبع نبضات القلب والـ GPS ممتازة وخدمة الدعم الفني راقية جداً.',
    quoteEn: 'TH Watch Ultra titanium build is fantastic! Precision heart rate and GPS tracking, plus top-notch customer care.',
    name: 'منى إبراهيم',
    nameEn: 'Mona Ibrahim',
    city: 'الإسكندرية',
    cityEn: 'Alexandria',
    product: 'TH Watch Ultra',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    quote: 'لابتوب AeroBook 14 بشاشة OLED ألوانها ساحرة ومريحة للعين. خفيف وأداؤه فائق السرعة في البرمجة والتصميم.',
    quoteEn: 'AeroBook 14 OLED screen colors are stunning and comfortable for long sessions. Extremely lightweight and rapid compiling.',
    name: 'كريم الشرقاوي',
    nameEn: 'Kareem El-Sharkawy',
    city: 'الشيخ زايد',
    cityEn: 'Sheikh Zayed',
    product: 'AeroBook 14 OLED',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  },
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
    badge: 'اختيار الجيمرز المحترفين 🔥',
    badgeEn: 'Pro Gamers Choice 🔥',
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

// ── Product Filter Tabs ───────────────────────────────────────────
const PRODUCT_TABS = [
  { key: 'all',           label: 'الكل' },
  { key: 'audio-phone',   label: 'سماعات وهواتف' },
  { key: 'watch-laptop',  label: 'ساعات ولابتوبات' },
  { key: 'camera-speaker',label: 'كاميرات ومكبرات' },
  { key: 'deals',         label: '🔥 عروض' },
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
    { key: 'deals',         label: t('home_tab_deals', '🔥 عروض') },
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
                    {cat.Icon ? <cat.Icon size={22} /> : <span style={{ fontSize: '1.4rem' }}>{cat.icon || '⚡'}</span>}
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
              background: 'linear-gradient(135deg, rgba(255, 94, 20, 0.12) 0%, rgba(18, 20, 28, 0.98) 100%)',
              border: '1px solid rgba(255, 94, 20, 0.3)',
              borderRadius: 'var(--radius-xl)',
              padding: '36px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 28,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ maxWidth: 640, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,94,20,0.15)', border: '1px solid rgba(255,94,20,0.4)', borderRadius: 9999, padding: '4px 12px', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--brand-orange)', marginBottom: 14 }}>
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
                <span style={{ fontSize: '0.72rem', background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 800 }}>
                  {isRtl ? 'متوافق 100% ✓' : '100% Compatible ✓'}
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
              padding: 4, borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border)',
              overflowX: 'auto', scrollbarWidth: 'none',
              flexShrink: 0,
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
                      borderRadius: 'var(--radius-full)',
                      padding: '6px 18px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.25,1,0.5,1)',
                      whiteSpace: 'nowrap',
                      boxShadow: isActive ? 'var(--shadow-orange)' : 'none',
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
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(18, 20, 28, 0.95) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
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
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38BDF8',
                padding: '12px 24px',
                borderRadius: 'var(--radius-sm)',
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
