import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Cpu,
  Layers,
  Monitor,
  Zap,
  HardDrive,
  Fan,
  Box,
  CheckCircle2,
  AlertTriangle,
  ShoppingBag,
  Sparkles,
  Trash2,
  RefreshCw,
  Search,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

const SLOTS = [
  { id: 'cpu', catId: 'cat-cpu', nameAr: 'المعالج (Processor)', nameEn: 'Processor (CPU)', icon: '⚙️', estWatt: 160 },
  { id: 'motherboard', catId: 'cat-motherboard', nameAr: 'اللوحة الأم (Motherboard)', nameEn: 'Motherboard', icon: '🧩', estWatt: 60 },
  { id: 'gpu', catId: 'cat-gpu', nameAr: 'كارت الشاشة (Graphics Card)', nameEn: 'Graphics Card (GPU)', icon: '🎮', estWatt: 320 },
  { id: 'ram', catId: 'cat-ram', nameAr: 'الذاكرة العشوائية (RAM)', nameEn: 'Memory (RAM)', icon: '⚡', estWatt: 30 },
  { id: 'storage', catId: 'cat-storage', nameAr: 'وحدات التخزين (SSD NVMe)', nameEn: 'Storage (SSD NVMe)', icon: '💾', estWatt: 15 },
  { id: 'cooling', catId: 'cat-cooling', nameAr: 'أنظمة التبريد (CPU Cooler)', nameEn: 'Cooling (CPU Cooler)', icon: '❄️', estWatt: 35 },
  { id: 'psu', catId: 'cat-psu', nameAr: 'مزود الطاقة (Power Supply)', nameEn: 'Power Supply (PSU)', icon: '🔌', estWatt: 0 },
  { id: 'case', catId: 'cat-case', nameAr: 'صندوق الحاسوب (PC Case)', nameEn: 'Chassis / Case', icon: '🖥️', estWatt: 10 },
];

// Fallback high-tier hardware catalog
const FALLBACK_HARDWARE = {
  cpu: [
    {
      id: 'prod-cpu-14900k',
      sku: 'CPU-INTEL-14900K',
      name: 'Intel Core i9-14900K Processor (24 Cores / 32 Threads)',
      name_en: 'Intel Core i9-14900K Raptor Lake Refresh',
      price: 27900,
      brand: 'Intel',
      socket: 'LGA1700',
      watt: 253,
      thumbnail: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&q=80',
      specs: { 'المقبس (Socket)': 'LGA1700', 'التردد الأقصى': '6.0 GHz', 'الأنوية': '24 Cores' }
    },
    {
      id: 'prod-cpu-7800x3d',
      sku: 'CPU-AMD-7800X3D',
      name: 'AMD Ryzen 7 7800X3D Gaming Processor (8 Cores / 16 Threads)',
      name_en: 'AMD Ryzen 7 7800X3D with 3D V-Cache',
      price: 21500,
      brand: 'AMD',
      socket: 'AM5',
      watt: 120,
      thumbnail: 'https://images.unsplash.com/photo-1555617778-02518510b9fa?w=400&q=80',
      specs: { 'المقبس (Socket)': 'AM5', 'التردد الأقصى': '5.0 GHz', 'الكاش': '104MB 3D V-Cache' }
    },
    {
      id: 'prod-cpu-14700k',
      sku: 'CPU-INTEL-14700K',
      name: 'Intel Core i7-14700K Processor (20 Cores / 28 Threads)',
      name_en: 'Intel Core i7-14700K Desktop Processor',
      price: 19800,
      brand: 'Intel',
      socket: 'LGA1700',
      watt: 240,
      thumbnail: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400&q=80',
      specs: { 'المقبس (Socket)': 'LGA1700', 'التردد': '5.6 GHz', 'الأنوية': '20 Cores' }
    },
    {
      id: 'prod-cpu-7600x',
      sku: 'CPU-AMD-7600X',
      name: 'AMD Ryzen 5 7600X Processor (6 Cores / 12 Threads)',
      name_en: 'AMD Ryzen 5 7600X AM5 Processor',
      price: 10900,
      brand: 'AMD',
      socket: 'AM5',
      watt: 105,
      thumbnail: 'https://images.unsplash.com/photo-1555617778-02518510b9fa?w=400&q=80',
      specs: { 'المقبس (Socket)': 'AM5', 'التردد': '5.3 GHz', 'الأنوية': '6 Cores' }
    }
  ],
  motherboard: [
    {
      id: 'prod-mb-z790-hero',
      sku: 'MB-ASUS-Z790-HERO',
      name: 'ASUS ROG Maximus Z790 Dark Hero Motherboard',
      name_en: 'ASUS ROG Maximus Z790 Dark Hero',
      price: 29500,
      brand: 'ASUS',
      socket: 'LGA1700',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
      specs: { 'المقبس (Socket)': 'LGA1700', 'نوع الرام': 'DDR5', 'الشبكات': 'WiFi 7 + 2.5G' }
    },
    {
      id: 'prod-mb-b650-strix',
      sku: 'MB-ASUS-B650E-STRIX',
      name: 'ASUS ROG Strix B650E-F Gaming WiFi Motherboard (AM5)',
      name_en: 'ASUS ROG Strix B650E-F Gaming WiFi',
      price: 14200,
      brand: 'ASUS',
      socket: 'AM5',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
      specs: { 'المقبس (Socket)': 'AM5', 'نوع الرام': 'DDR5', 'الشبكات': 'WiFi 6E' }
    },
    {
      id: 'prod-mb-b760-wifi',
      sku: 'MB-MSI-B760-WIFI',
      name: 'MSI MAG B760 TOMAHAWK WIFI DDR5 Motherboard',
      name_en: 'MSI MAG B760 TOMAHAWK WIFI',
      price: 11800,
      brand: 'MSI',
      socket: 'LGA1700',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
      specs: { 'المقبس (Socket)': 'LGA1700', 'نوع الرام': 'DDR5', 'الشريحة': 'B760' }
    },
    {
      id: 'prod-mb-b650-aorus',
      sku: 'MB-GIGABYTE-B650-AORUS',
      name: 'Gigabyte B650 AORUS Elite AX Motherboard (AM5)',
      name_en: 'Gigabyte B650 AORUS Elite AX',
      price: 10500,
      brand: 'Gigabyte',
      socket: 'AM5',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
      specs: { 'المقبس (Socket)': 'AM5', 'نوع الرام': 'DDR5' }
    }
  ],
  gpu: [
    {
      id: 'prod-gpu-rtx4090',
      sku: 'GPU-ASUS-RTX4090-24G',
      name: 'ASUS ROG Strix GeForce RTX 4090 24GB GDDR6X OC',
      name_en: 'ASUS ROG Strix GeForce RTX 4090 24GB OC',
      price: 98000,
      brand: 'ASUS',
      watt: 450,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'الذاكرة': '24GB GDDR6X', 'المزود الموصى به': '1000 Watt', 'الدقة': '4K Ultra' }
    },
    {
      id: 'prod-gpu-rtx4080s',
      sku: 'GPU-MSI-RTX4080S-16G',
      name: 'MSI GeForce RTX 4080 SUPER 16GB Gaming X Slim',
      name_en: 'MSI GeForce RTX 4080 SUPER 16GB Gaming X Slim',
      price: 54000,
      brand: 'MSI',
      watt: 320,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'الذاكرة': '16GB GDDR6X', 'المزود الموصى به': '850 Watt', 'الدقة': '4K / 2K' }
    },
    {
      id: 'prod-gpu-rtx4070ti-super',
      sku: 'GPU-GIGABYTE-RTX4070TI-S',
      name: 'Gigabyte GeForce RTX 4070 Ti SUPER Aero OC 16GB',
      name_en: 'Gigabyte GeForce RTX 4070 Ti SUPER Aero OC 16GB',
      price: 42500,
      brand: 'Gigabyte',
      watt: 285,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'الذاكرة': '16GB GDDR6X', 'المزود الموصى به': '750 Watt', 'الدقة': '2K Esports' }
    },
    {
      id: 'prod-gpu-rtx4060ti',
      sku: 'GPU-ASUS-RTX4060TI-8G',
      name: 'ASUS Dual GeForce RTX 4060 Ti 8GB OC Edition',
      name_en: 'ASUS Dual GeForce RTX 4060 Ti 8GB OC',
      price: 19800,
      brand: 'ASUS',
      watt: 160,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'الذاكرة': '8GB GDDR6', 'المزود الموصى به': '650 Watt', 'الدقة': '1080p High' }
    }
  ],
  ram: [
    {
      id: 'prod-ram-dominator-64',
      sku: 'RAM-CORSAIR-DOMINATOR-64',
      name: 'Corsair Dominator Titanium RGB 64GB (2x32GB) DDR5 6000MHz',
      name_en: 'Corsair Dominator Titanium RGB 64GB DDR5',
      price: 13900,
      brand: 'Corsair',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&q=80',
      specs: { 'السعة': '64GB (2x32GB)', 'التردد': '6000 MHz', 'النوع': 'DDR5' }
    },
    {
      id: 'prod-ram-vengeance-32',
      sku: 'RAM-CORSAIR-VENGEANCE-32',
      name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL30',
      name_en: 'Corsair Vengeance RGB 32GB DDR5 6000MHz',
      price: 6800,
      brand: 'Corsair',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&q=80',
      specs: { 'السعة': '32GB (2x16GB)', 'التردد': '6000 MHz', 'النوع': 'DDR5' }
    },
    {
      id: 'prod-ram-fury-32',
      sku: 'RAM-KINGSTON-FURY-32',
      name: 'Kingston FURY Beast 32GB (2x16GB) DDR5 5600MHz',
      name_en: 'Kingston FURY Beast 32GB DDR5 5600MHz',
      price: 5400,
      brand: 'Kingston',
      ramType: 'DDR5',
      thumbnail: 'https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&q=80',
      specs: { 'السعة': '32GB (2x16GB)', 'التردد': '5600 MHz' }
    }
  ],
  storage: [
    {
      id: 'prod-ssd-990pro-2tb',
      sku: 'SSD-SAMSUNG-990PRO-2TB',
      name: 'Samsung 990 PRO 2TB PCIe 4.0 NVMe M.2 SSD (7,450 MB/s)',
      name_en: 'Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD',
      price: 8900,
      brand: 'Samsung',
      thumbnail: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80',
      specs: { 'السعة': '2TB', 'السرعة': '7,450 MB/s', 'الواجهة': 'PCIe Gen 4' }
    },
    {
      id: 'prod-ssd-t700-2tb',
      sku: 'SSD-CRUCIAL-T700-2TB',
      name: 'Crucial T700 2TB PCIe Gen5 NVMe M.2 SSD (12,400 MB/s)',
      name_en: 'Crucial T700 2TB PCIe 5.0 NVMe SSD',
      price: 13500,
      brand: 'Crucial',
      thumbnail: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80',
      specs: { 'السعة': '2TB', 'السرعة': '12,400 MB/s', 'الواجهة': 'PCIe Gen 5' }
    },
    {
      id: 'prod-ssd-kc3000-1tb',
      sku: 'SSD-KINGSTON-KC3000-1TB',
      name: 'Kingston KC3000 1TB PCIe 4.0 NVMe M.2 SSD (7,000 MB/s)',
      name_en: 'Kingston KC3000 1TB NVMe PCIe 4.0 SSD',
      price: 4600,
      brand: 'Kingston',
      thumbnail: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&q=80',
      specs: { 'السعة': '1TB', 'السرعة': '7,000 MB/s' }
    }
  ],
  cooling: [
    {
      id: 'prod-cooler-kraken-360',
      sku: 'COOLER-NZXT-KRAKEN-360',
      name: 'NZXT Kraken Elite 360 RGB Liquid Cooler with LCD Display',
      name_en: 'NZXT Kraken Elite 360 RGB AIO Cooler',
      price: 14800,
      brand: 'NZXT',
      thumbnail: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80',
      specs: { 'الحجم': '360 mm (3x120mm)', 'الشاشة': '2.36" LCD Screen', 'المضخة': 'Asetek Gen 7' }
    },
    {
      id: 'prod-cooler-h150i',
      sku: 'COOLER-CORSAIR-H150I',
      name: 'Corsair iCUE LINK H150i RGB 360mm AIO Liquid Cooler',
      name_en: 'Corsair iCUE LINK H150i RGB 360mm AIO',
      price: 12900,
      brand: 'Corsair',
      thumbnail: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80',
      specs: { 'الحجم': '360 mm', 'المنظومة': 'iCUE LINK Ecosystem' }
    },
    {
      id: 'prod-cooler-ak620',
      sku: 'COOLER-DEEPCOOL-AK620',
      name: 'DeepCool AK620 Digital Dual-Tower CPU Air Cooler',
      name_en: 'DeepCool AK620 Digital Dual-Tower Air Cooler',
      price: 3900,
      brand: 'DeepCool',
      thumbnail: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80',
      specs: { 'النوع': 'Dual-Tower Air Cooler', 'القدرة': '260W TDP', 'الشاشة': 'Digital Status Screen' }
    }
  ],
  psu: [
    {
      id: 'prod-psu-rm1000x',
      sku: 'PSU-CORSAIR-RM1000X',
      name: 'Corsair RM1000x SHIFT 1000W 80+ Gold Fully Modular ATX 3.0',
      name_en: 'Corsair RM1000x SHIFT 1000W 80+ Gold ATX 3.0',
      price: 10800,
      brand: 'Corsair',
      psuCapacity: 1000,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'القدرة': '1000 Watt', 'الكفاءة': '80+ Gold', 'المعيار': 'ATX 3.0 & PCIe 5.0' }
    },
    {
      id: 'prod-psu-thor-850w',
      sku: 'PSU-ASUS-THOR-850P2',
      name: 'ASUS ROG Thor 850W Platinum II Fully Modular with OLED',
      name_en: 'ASUS ROG Thor 850W Platinum II Modular',
      price: 13500,
      brand: 'ASUS',
      psuCapacity: 850,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'القدرة': '850 Watt', 'الكفاءة': '80+ Platinum', 'الشاشة': 'OLED Power Display' }
    },
    {
      id: 'prod-psu-mag-750w',
      sku: 'PSU-MSI-MAG-750GL',
      name: 'MSI MAG A750GL PCIE5 750W 80+ Gold Fully Modular ATX 3.0',
      name_en: 'MSI MAG A750GL 750W 80+ Gold ATX 3.0',
      price: 5900,
      brand: 'MSI',
      psuCapacity: 750,
      thumbnail: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&q=80',
      specs: { 'القدرة': '750 Watt', 'الكفاءة': '80+ Gold', 'المعيار': 'PCIe 5.0 Ready' }
    }
  ],
  case: [
    {
      id: 'prod-case-o11-evo',
      sku: 'CASE-LIANLI-O11-EVO-RGB',
      name: 'Lian Li O11 Dynamic EVO RGB Full-Tower Case (Black)',
      name_en: 'Lian Li O11 Dynamic EVO RGB Full-Tower',
      price: 9800,
      brand: 'Lian Li',
      thumbnail: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80',
      specs: { 'النوع': 'Full-Tower Dual Chamber', 'الزجاج': 'Dual Tempered Glass', 'الرادياتير': 'Up to 3x 360mm' }
    },
    {
      id: 'prod-case-nzxt-h9',
      sku: 'CASE-NZXT-H9-FLOW',
      name: 'NZXT H9 Flow Dual-Chamber Mid-Tower ATX Case (White)',
      name_en: 'NZXT H9 Flow Dual-Chamber Mid-Tower',
      price: 8900,
      brand: 'NZXT',
      thumbnail: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80',
      specs: { 'النوع': 'Mid-Tower Dual Chamber', 'اللون': 'White Edition', 'المراوح': '4x 120mm Fans' }
    },
    {
      id: 'prod-case-corsair-4000d',
      sku: 'CASE-CORSAIR-4000D-AIR',
      name: 'Corsair 4000D Airflow Tempered Glass Mid-Tower Case',
      name_en: 'Corsair 4000D Airflow Mid-Tower ATX Case',
      price: 4900,
      brand: 'Corsair',
      thumbnail: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&q=80',
      specs: { 'النوع': 'Mid-Tower ATX', 'التهوية': 'High-Airflow Front Panel', 'الزجاج': 'Tempered Glass' }
    }
  ]
};

// Helper to check compatibility of a single product with currently selected parts
function checkItemCompatibility(slotId, product, currentParts) {
  const issues = [];

  // 1. Motherboard socket check against selected CPU
  if (slotId === 'motherboard' && currentParts.cpu) {
    const cpuSocket = currentParts.cpu.specs?.['المقبس (Socket)'] || currentParts.cpu.socket || (currentParts.cpu.name?.includes('Intel') ? 'LGA1700' : 'AM5');
    const mbSocket = product.specs?.['المقبس (Socket)'] || product.socket || (product.name?.includes('Z790') || product.name?.includes('B760') ? 'LGA1700' : 'AM5');
    if (cpuSocket !== mbSocket) {
      issues.push(`غير متوافق مع مقبس المعالج الحالي (${cpuSocket})`);
    }
  }

  // 2. CPU socket check against selected Motherboard
  if (slotId === 'cpu' && currentParts.motherboard) {
    const mbSocket = currentParts.motherboard.specs?.['المقبس (Socket)'] || currentParts.motherboard.socket || (currentParts.motherboard.name?.includes('Z790') || currentParts.motherboard.name?.includes('B760') ? 'LGA1700' : 'AM5');
    const cpuSocket = product.specs?.['المقبس (Socket)'] || product.socket || (product.name?.includes('Intel') ? 'LGA1700' : 'AM5');
    if (cpuSocket !== mbSocket) {
      issues.push(`غير متوافق مع مقبس اللوحة الأم الحالية (${mbSocket})`);
    }
  }

  // 3. RAM compatibility with Motherboard
  if (slotId === 'ram' && currentParts.motherboard) {
    const mbRam = currentParts.motherboard.specs?.['نوع الرام'] || currentParts.motherboard.ramType || 'DDR5';
    const ramType = product.specs?.['النوع'] || product.ramType || (product.name?.includes('DDR5') ? 'DDR5' : 'DDR4');
    if (mbRam && ramType && !mbRam.includes(ramType)) {
      issues.push(`يتطلب نوع رام (${mbRam})`);
    }
  }

  return {
    isCompatible: issues.length === 0,
    reason: issues[0] || null
  };
}

export default function PCBuilder() {
  const { isRtl, t } = useLanguage();
  const [selectedParts, setSelectedParts] = useState({});
  const [activeSlotId, setActiveSlotId] = useState(null); // which slot drawer is open inline
  const [slotProductsMap, setSlotProductsMap] = useState({});
  const [loadingSlot, setLoadingSlot] = useState(false);
  const [searchQueries, setSearchQueries] = useState({});
  const [onlyCompatible, setOnlyCompatible] = useState(true);

  const { addItem, addToCart, setOpen } = useCart();

  // Fetch products for the active slot if not already loaded
  useEffect(() => {
    if (!activeSlotId) return;
    if (slotProductsMap[activeSlotId] && slotProductsMap[activeSlotId].length > 0) return;

    const slotDef = SLOTS.find((s) => s.id === activeSlotId);
    if (!slotDef) return;

    setLoadingSlot(true);
    api.getProducts({ category: slotDef.catId, limit: 30 })
      .then((res) => {
        const prods = res.data || res.products || [];
        if (prods.length > 0) {
          setSlotProductsMap((prev) => ({ ...prev, [activeSlotId]: prods }));
        } else {
          setSlotProductsMap((prev) => ({ ...prev, [activeSlotId]: FALLBACK_HARDWARE[activeSlotId] || [] }));
        }
      })
      .catch(() => {
        setSlotProductsMap((prev) => ({ ...prev, [activeSlotId]: FALLBACK_HARDWARE[activeSlotId] || [] }));
      })
      .finally(() => setLoadingSlot(false));
  }, [activeSlotId, slotProductsMap]);

  const toggleSlot = (slotId) => {
    setActiveSlotId((prev) => (prev === slotId ? null : slotId));
  };

  const handleSelectProduct = (slotId, product) => {
    // Check compatibility before selecting
    const check = checkItemCompatibility(slotId, product, selectedParts);
    if (!check.isCompatible) {
      toast.error(isRtl ? `تنبيه: القطعة غير متوافقة (${check.reason})` : `Incompatible component: ${check.reason}`);
      return;
    }

    setSelectedParts((prev) => ({
      ...prev,
      [slotId]: product,
    }));
    setActiveSlotId(null);
    toast.success(isRtl ? `تم اختيار: ${product.name} ✓` : `Selected: ${product.name} ✓`);
  };

  const handleRemovePart = (slotId) => {
    setSelectedParts((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  // Calculations
  const totalPrice = Object.values(selectedParts).reduce((sum, p) => sum + (Number(p.price) || 0), 0);

  const totalWattage = useMemo(() => {
    let watt = 100; // 100W base motherboard and fans
    if (selectedParts.cpu) {
      const cpuName = selectedParts.cpu.name || '';
      if (cpuName.includes('14900K') || cpuName.includes('13900K')) watt += 260;
      else if (cpuName.includes('14700K')) watt += 240;
      else if (cpuName.includes('7800X3D')) watt += 120;
      else watt += 130;
    }
    if (selectedParts.gpu) {
      const gpuName = selectedParts.gpu.name || '';
      if (gpuName.includes('4090')) watt += 450;
      else if (gpuName.includes('4080')) watt += 320;
      else if (gpuName.includes('4070')) watt += 250;
      else if (gpuName.includes('4060')) watt += 160;
      else watt += 200;
    }
    if (selectedParts.ram) watt += 30;
    if (selectedParts.storage) watt += 15;
    if (selectedParts.cooling) watt += 35;
    return watt;
  }, [selectedParts]);

  const recommendedPSU = Math.ceil((totalWattage * 1.35) / 50) * 50;

  // Global build compatibility check
  const globalCompatibility = useMemo(() => {
    const issues = [];
    const cpu = selectedParts.cpu;
    const mb = selectedParts.motherboard;
    const psu = selectedParts.psu;

    if (cpu && mb) {
      const cpuSocket = cpu.specs?.['المقبس (Socket)'] || cpu.socket || (cpu.name?.includes('Intel') || cpu.name?.includes('14900') ? 'LGA1700' : 'AM5');
      const mbSocket = mb.specs?.['المقبس (Socket)'] || mb.socket || (mb.name?.includes('Z790') || mb.name?.includes('B760') ? 'LGA1700' : 'AM5');

      if (cpuSocket !== mbSocket) {
        issues.push({
          type: 'error',
          title: isRtl ? 'عدم توافق المقبس (Socket Mismatch)' : 'Socket Incompatibility',
          message: isRtl
            ? `المعالج يعمل بمقبس (${cpuSocket}) بينما اللوحة الأم تدعم مقبس (${mbSocket}). لا يمكن تركيبهما معاً.`
            : `CPU uses socket (${cpuSocket}) while Motherboard uses (${mbSocket}). Please choose a matching motherboard.`
        });
      }
    }

    if (psu) {
      const psuCapacity = parseInt(psu.specs?.['القدرة'] || psu.specs?.['القدرة (Wattage)'] || psu.name?.match(/\d{3,4}W/i)?.[0] || '750');
      if (psuCapacity < totalWattage) {
        issues.push({
          type: 'warning',
          title: isRtl ? 'طاقة غير كافية لمزود الطاقة' : 'Insufficient PSU Capacity',
          message: isRtl
            ? `مزود الطاقة المحدد (${psuCapacity}W) أقل من إجمالي استهلاك التجميعة (${totalWattage}W). نوصي بـ ${recommendedPSU}W.`
            : `Selected PSU (${psuCapacity}W) is lower than total power consumption (${totalWattage}W). We recommend ${recommendedPSU}W.`
        });
      }
    }

    return {
      isValid: issues.filter((i) => i.type === 'error').length === 0,
      issues
    };
  }, [selectedParts, totalWattage, recommendedPSU, isRtl]);

  // Quick Presets
  const loadPreset = (presetType) => {
    if (presetType === 'ultra') {
      setSelectedParts({
        cpu: FALLBACK_HARDWARE.cpu[0],
        motherboard: FALLBACK_HARDWARE.motherboard[0],
        gpu: FALLBACK_HARDWARE.gpu[0],
        ram: FALLBACK_HARDWARE.ram[0],
        storage: FALLBACK_HARDWARE.storage[0],
        cooling: FALLBACK_HARDWARE.cooling[0],
        psu: FALLBACK_HARDWARE.psu[0],
        case: FALLBACK_HARDWARE.case[0]
      });
      toast.success(isRtl ? 'تم تحميل تجميعة 4K Ultra Gaming الخارقة بنجاح 🚀' : 'Loaded 4K Ultra Gaming build preset 🚀');
    } else if (presetType === 'esports') {
      setSelectedParts({
        cpu: FALLBACK_HARDWARE.cpu[1],
        motherboard: FALLBACK_HARDWARE.motherboard[1],
        gpu: FALLBACK_HARDWARE.gpu[2],
        ram: FALLBACK_HARDWARE.ram[1],
        storage: FALLBACK_HARDWARE.storage[0],
        cooling: FALLBACK_HARDWARE.cooling[1],
        psu: FALLBACK_HARDWARE.psu[1],
        case: FALLBACK_HARDWARE.case[1]
      });
      toast.success(isRtl ? 'تم تحميل تجميعة Pro Esports 2K المتوازنة بنجاح ⚡' : 'Loaded Pro Esports 2K build preset ⚡');
    } else if (presetType === 'budget') {
      setSelectedParts({
        cpu: FALLBACK_HARDWARE.cpu[3],
        motherboard: FALLBACK_HARDWARE.motherboard[3],
        gpu: FALLBACK_HARDWARE.gpu[3],
        ram: FALLBACK_HARDWARE.ram[2],
        storage: FALLBACK_HARDWARE.storage[2],
        cooling: FALLBACK_HARDWARE.cooling[2],
        psu: FALLBACK_HARDWARE.psu[2],
        case: FALLBACK_HARDWARE.case[2]
      });
      toast.success(isRtl ? 'تم تحميل تجميعة Smart Value 1080p الاقتصادية بنجاح 💡' : 'Loaded Smart Value 1080p build preset 💡');
    }
  };

  const handleAddAllToCart = () => {
    const addFn = addItem || addToCart;
    const partsArray = Object.values(selectedParts);
    if (partsArray.length === 0) {
      toast.warning(isRtl ? 'يرجى اختيار قطعة واحدة على الأقل لإضافتها لعربة التسوق.' : 'Please select at least one component to add to cart.');
      return;
    }

    if (!globalCompatibility.isValid) {
      toast.error(isRtl ? 'يرجى معالجة أخطاء التوافق قبل إضافة التجميعة للسلة.' : 'Please resolve compatibility errors before adding build to cart.');
      return;
    }

    partsArray.forEach((part) => {
      addFn(part, 1);
    });

    toast.success(
      isRtl
        ? `تمت إضافة التجميعة كاملة (${partsArray.length} قطع) إلى عربة التسوق بنجاح! ✓`
        : `Added complete build (${partsArray.length} components) to cart ✓`
    );
    setOpen(true);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '24px 0 80px' }}>
      <div className="container">
        {/* ── Header ───────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 94, 20, 0.12)',
              color: 'var(--brand-orange)',
              fontSize: '0.82rem',
              fontWeight: 800,
              padding: '6px 16px',
              borderRadius: '99px',
              marginBottom: '14px',
              border: '1px solid rgba(255, 94, 20, 0.25)',
            }}
          >
            <Sparkles size={15} />
            <span>TechHaven Custom PC Studio</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', marginBottom: '12px' }}>
            {isRtl ? 'مُجمّع الحواسيب الاحترافي الذكي' : 'Smart Custom PC Builder Studio'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.6, margin: '0 0 24px' }}>
            {isRtl
              ? 'اختر مكونات جهازك خطوة بخطوة مع فحص فوري للتوافق وقوائم منسدلة ذكية تحت كل قسم، مع حساب استهلاك الطاقة وإمكانية طلب التجميعة بنقرة واحدة.'
              : 'Assemble your dream PC step by step with real-time component filtering, inline selection drawers, TDP calculation, and one-click checkout.'}
          </p>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => loadPreset('ultra')}
              className="btn btn-sm btn-apple-tactile"
              style={{
                background: 'rgba(255, 94, 20, 0.15)',
                border: '1px solid var(--brand-orange)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 800,
                padding: '8px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>🚀</span>
              <span>{isRtl ? 'تجميعة 4K Ultra Gaming' : '4K Ultra Gaming Preset'}</span>
            </button>
            <button
              onClick={() => loadPreset('esports')}
              className="btn btn-sm btn-apple-tactile"
              style={{
                background: 'rgba(0, 212, 170, 0.12)',
                border: '1px solid var(--secondary)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 800,
                padding: '8px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>⚡</span>
              <span>{isRtl ? 'تجميعة 2K Pro Esports' : '2K Pro Esports Preset'}</span>
            </button>
            <button
              onClick={() => loadPreset('budget')}
              className="btn btn-sm btn-apple-tactile"
              style={{
                background: 'rgba(108, 99, 255, 0.12)',
                border: '1px solid var(--primary)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 800,
                padding: '8px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>💡</span>
              <span>{isRtl ? 'تجميعة 1080p Smart Value' : '1080p Smart Value Preset'}</span>
            </button>
          </div>
        </div>

        {/* ── Main Studio Grid (Slots on right, Summary on left) ── */}
        <div className="th-pcbuilder-layout">
          {/* Slots List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {SLOTS.map((slot) => {
              const selected = selectedParts[slot.id];
              const isExpanded = activeSlotId === slot.id;
              const searchQuery = searchQueries[slot.id] || '';

              // Get all products for this slot
              const rawProducts = slotProductsMap[slot.id] || FALLBACK_HARDWARE[slot.id] || [];

              // Filter by compatibility & search
              const productsWithCompat = rawProducts.map((p) => {
                const compat = checkItemCompatibility(slot.id, p, selectedParts);
                return { ...p, ...compat };
              });

              const filteredProducts = productsWithCompat.filter((p) => {
                const matchesSearch =
                  (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase());
                if (!matchesSearch) return false;
                if (onlyCompatible && !p.isCompatible) return false;
                return true;
              });

              const compatibleCount = productsWithCompat.filter((p) => p.isCompatible).length;

              return (
                <div key={slot.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* 1. Main Slot Row */}
                  <div
                    className={`th-pcbuilder-slot ${selected ? 'selected' : ''}`}
                    style={{
                      borderBottomLeftRadius: isExpanded ? 0 : 'var(--radius-md)',
                      borderBottomRightRadius: isExpanded ? 0 : 'var(--radius-md)',
                      borderBottomColor: isExpanded ? 'transparent' : undefined,
                      boxShadow: isExpanded ? '0 -4px 18px rgba(0,0,0,0.4)' : undefined,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      {/* Product Thumbnail replaces icon once selected */}
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: '12px',
                          background: selected ? '#0D0E13' : '#1C1E2A',
                          border: selected ? '1.5px solid rgba(255, 94, 20, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: selected ? '0 4px 14px rgba(255, 94, 20, 0.2)' : 'none',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        {selected && selected.thumbnail ? (
                          <img
                            src={selected.thumbnail}
                            alt={selected.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              padding: 4,
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.4rem' }}>{slot.icon}</span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: '#9CA3AF', fontWeight: 800 }}>
                          {isRtl ? slot.nameAr : slot.nameEn}
                        </div>

                        {selected ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: 2, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '320px',
                              }}
                            >
                              {isRtl ? selected.name : (selected.name_en || selected.name)}
                            </span>
                            <span style={{ color: 'var(--brand-orange)', fontWeight: 900, fontSize: '0.94rem' }}>
                              {(selected.price || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                            {isRtl ? 'لم يتم اختيار قطعة بعد' : 'No component selected yet'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="th-pcbuilder-slot-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selected && (
                        <button
                          className="btn btn-sm btn-ghost btn-apple-tactile"
                          style={{ color: '#EF4444', padding: '6px 10px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePart(slot.id);
                          }}
                          title={isRtl ? 'إزالة' : 'Remove'}
                        >
                          ✕
                        </button>
                      )}

                      <button
                        className={`btn btn-sm ${isExpanded ? 'btn-secondary' : 'btn-primary'} btn-apple-tactile`}
                        onClick={() => toggleSlot(slot.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {isExpanded ? (
                          <>
                            <span>{isRtl ? 'إغلاق القائمة' : 'Close'}</span>
                            <ChevronUp size={15} />
                          </>
                        ) : selected ? (
                          <>
                            <span>{isRtl ? 'تغيير' : 'Change'}</span>
                            <ChevronDown size={15} />
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>{isRtl ? 'اختيار' : 'Select'}</span>
                            <ChevronDown size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. Inline Expanding Drawer directly underneath this slot row */}
                  {isExpanded && (
                    <div
                      style={{
                        background: '#10121A',
                        border: '1px solid rgba(255, 94, 20, 0.4)',
                        borderTop: 'none',
                        borderBottomLeftRadius: '14px',
                        borderBottomRightRadius: '14px',
                        padding: '16px 20px',
                        marginBottom: '8px',
                        boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                        animation: 'fadeIn 0.2s ease-out',
                      }}
                    >
                      {/* Drawer Toolbar */}
                      <div
                        className="th-pcbuilder-drawer-toolbar"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          marginBottom: 14,
                          paddingBottom: 10,
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: '220px' }}>
                          <div style={{ position: 'relative', width: '100%' }}>
                            <input
                              type="text"
                              placeholder={isRtl ? `ابحث في ${slot.nameAr}...` : `Search in ${slot.nameEn}...`}
                              value={searchQuery}
                              onChange={(e) =>
                                setSearchQueries((prev) => ({ ...prev, [slot.id]: e.target.value }))
                              }
                              style={{
                                width: '100%',
                                background: '#090A0E',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                paddingInlineStart: '34px',
                                color: '#fff',
                                fontSize: '0.84rem',
                                outline: 'none',
                              }}
                            />
                            <Search
                              size={15}
                              style={{
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                [isRtl ? 'right' : 'left']: 10,
                                color: 'var(--text-muted)',
                              }}
                            />
                          </div>
                        </div>

                        {/* Compatibility Toggle Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: onlyCompatible ? '#10B981' : '#9CA3AF',
                              cursor: 'pointer',
                              background: onlyCompatible ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.05)',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${onlyCompatible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={onlyCompatible}
                              onChange={(e) => setOnlyCompatible(e.target.checked)}
                              style={{ accentColor: '#10B981' }}
                            />
                            <span>{isRtl ? `القطع المتوافقة فقط (${compatibleCount})` : `Compatible Only (${compatibleCount})`}</span>
                          </label>

                          <button
                            className="btn btn-ghost"
                            onClick={() => setActiveSlotId(null)}
                            style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#9CA3AF' }}
                          >
                            {isRtl ? 'إغلاق ✕' : 'Close ✕'}
                          </button>
                        </div>
                      </div>

                      {/* Compatibility Hint Banner if applicable */}
                      {slot.id === 'motherboard' && selectedParts.cpu && (
                        <div
                          style={{
                            background: 'rgba(0, 212, 170, 0.08)',
                            border: '1px solid rgba(0, 212, 170, 0.25)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'var(--secondary)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>
                            {isRtl
                              ? `يتم عرض اللوحات الأم المتوافقة مع معالجك الحالي بمقبس (${selectedParts.cpu.specs?.['المقبس (Socket)'] || selectedParts.cpu.socket || 'LGA1700 / AM5'})`
                              : `Filtering motherboards matching CPU socket (${selectedParts.cpu.specs?.['المقبس (Socket)'] || selectedParts.cpu.socket})`}
                          </span>
                        </div>
                      )}

                      {slot.id === 'cpu' && selectedParts.motherboard && (
                        <div
                          style={{
                            background: 'rgba(0, 212, 170, 0.08)',
                            border: '1px solid rgba(0, 212, 170, 0.25)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'var(--secondary)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>
                            {isRtl
                              ? `يتم عرض المعالجات المتوافقة مع مقبس لوحتك الأم (${selectedParts.motherboard.specs?.['المقبس (Socket)'] || selectedParts.motherboard.socket || 'LGA1700 / AM5'})`
                              : `Filtering processors matching motherboard socket (${selectedParts.motherboard.specs?.['المقبس (Socket)'] || selectedParts.motherboard.socket})`}
                          </span>
                        </div>
                      )}

                      {/* Products List */}
                      <div
                        style={{
                          maxHeight: '380px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {loadingSlot ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                            <RefreshCw size={22} className="spin" style={{ margin: '0 auto 8px', display: 'block', color: 'var(--brand-orange)' }} />
                            <span>{isRtl ? 'جاري تصفية القطع المتوافقة...' : 'Filtering compatible hardware...'}</span>
                          </div>
                        ) : filteredProducts.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                            {isRtl
                              ? 'لا توجد قطع متوافقة مطابقة لبحثك في هذا القسم.'
                              : 'No compatible components match your search in this category.'}
                          </div>
                        ) : (
                          filteredProducts.map((p) => {
                            const isCurrent = selected?.id === p.id;
                            const isComp = p.isCompatible;

                            return (
                              <div
                                key={p.id}
                                className="th-pcbuilder-drawer-item"
                                style={{
                                  background: isCurrent ? 'rgba(255, 94, 20, 0.12)' : '#141620',
                                  border: `1px solid ${isCurrent ? 'var(--brand-orange)' : isComp ? 'rgba(255, 255, 255, 0.08)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  borderRadius: '10px',
                                  padding: '10px 14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 12,
                                  opacity: isComp ? 1 : 0.6,
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: '180px' }}>
                                  <img
                                    src={p.thumbnail || (p.images && p.images[0]) || 'https://via.placeholder.com/80'}
                                    alt={p.name}
                                    style={{
                                      width: 48,
                                      height: 48,
                                      objectFit: 'contain',
                                      background: '#08090C',
                                      borderRadius: 8,
                                      padding: 3,
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      flexShrink: 0,
                                    }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <strong style={{ color: '#fff', fontSize: '0.88rem' }}>
                                        {isRtl ? p.name : (p.name_en || p.name)}
                                      </strong>
                                      {isComp ? (
                                        <span style={{ fontSize: '0.68rem', color: '#10B981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                                          ✓ {isRtl ? 'متوافق 100%' : 'Compatible'}
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.68rem', color: '#EF4444', background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                                          ✕ {p.reason || (isRtl ? 'غير متوافق' : 'Incompatible')}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
                                      <span style={{ fontSize: '0.7rem', color: '#D1D5DB', background: 'rgba(255, 255, 255, 0.08)', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                        {p.brand}
                                      </span>
                                      {p.specs &&
                                        Object.entries(p.specs).slice(0, 2).map(([k, v], sIdx) => (
                                          <span key={sIdx} style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                                            • {k}: <strong style={{ color: '#fff' }}>{v}</strong>
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                </div>

                                <div className="th-pcbuilder-drawer-item-actions" style={{ textAlign: isRtl ? 'left' : 'right', display: 'flex', alignItems: 'center', gap: 10, marginInlineStart: 'auto' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--brand-orange)', whiteSpace: 'nowrap' }}>
                                    {(p.price || 0).toLocaleString(isRtl ? 'ar-EG' : 'en-US')} {t('currency')}
                                  </span>

                                  {isCurrent ? (
                                    <button
                                      disabled
                                      className="btn btn-sm"
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        border: '1px solid #10B981',
                                        color: '#10B981',
                                        fontSize: '0.78rem',
                                        padding: '6px 10px',
                                        cursor: 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                      }}
                                    >
                                      <Check size={14} />
                                      <span>{isRtl ? 'مُحدّد' : 'Selected'}</span>
                                    </button>
                                  ) : (
                                    <button
                                      disabled={!isComp}
                                      className="btn btn-sm btn-primary btn-apple-tactile"
                                      onClick={() => handleSelectProduct(slot.id, p)}
                                      style={{
                                        fontSize: '0.78rem',
                                        padding: '6px 12px',
                                        opacity: isComp ? 1 : 0.4,
                                        cursor: isComp ? 'pointer' : 'not-allowed',
                                      }}
                                    >
                                      {isRtl ? 'اختيار ✓' : 'Select ✓'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Summary & Wattage Sidebar ──────────────────────── */}
          <div
            style={{
              background: '#14161F',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '24px',
              position: 'sticky',
              top: '90px',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📊</span>
              <span>{isRtl ? 'ملخص التجميعة' : 'Build Summary'}</span>
            </h3>

            {/* Price Box */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isRtl ? 'التكلفة الإجمالية:' : 'Total Price:'}
              </span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', marginTop: 4 }}>
                {totalPrice.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                <span style={{ fontSize: '1rem', color: 'var(--brand-orange)', marginInlineStart: 6 }}>{t('currency')}</span>
              </div>
            </div>

            {/* Compatibility Badge / Alert */}
            {globalCompatibility.issues.length > 0 ? (
              <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {globalCompatibility.issues.map((iss, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: iss.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      border: `1px solid ${iss.type === 'error' ? '#EF4444' : '#F59E0B'}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: iss.type === 'error' ? '#EF4444' : '#F59E0B',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ display: 'block', marginBottom: 2 }}>{iss.title}</strong>
                      <span style={{ color: '#E5E7EB' }}>{iss.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : Object.keys(selectedParts).length > 1 ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10B981',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#10B981',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 18,
                  fontWeight: 800,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{isRtl ? '✓ جميع المكونات المختارة متوافقة 100%' : '✓ All selected components are 100% compatible'}</span>
              </div>
            ) : null}

            {/* Wattage & Compatibility Engine */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isRtl ? 'استهلاك الطاقة المقدر:' : 'Estimated Power Draw:'}
                </span>
                <strong style={{ color: '#FFA502' }}>
                  {totalWattage} {isRtl ? 'واط تقريباً' : 'Watts (approx)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {isRtl ? 'الباور سبلاي الموصى به:' : 'Recommended PSU:'}
                </span>
                <strong style={{ color: 'var(--brand-orange)' }}>
                  {recommendedPSU} {isRtl ? 'واط أو أكثر' : 'Watts or more'}
                </strong>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: 6, background: '#0A0B0E', borderRadius: 99, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (totalWattage / 1000) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #FF5E14, #FFA502)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Guarantees */}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '22px' }}>
              <div>{isRtl ? '✓ تجميع واختبار وتحديث BIOS مجاناً' : '✓ Free professional assembly, testing & BIOS flash'}</div>
              <div>{isRtl ? '✓ كابلات مرتبة ومغلفة احترافياً (Cable Management)' : '✓ Professional clean cable management'}</div>
              <div>{isRtl ? '✓ ضمان شامل 3 سنوات على كل قطعة معتمد' : '✓ 3-Year official certified component warranty'}</div>
            </div>

            {/* CTA Buttons */}
            <button
              className="btn btn-primary btn-apple-tactile"
              style={{ width: '100%', marginBottom: '10px', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={handleAddAllToCart}
            >
              <ShoppingBag size={18} />
              <span>{isRtl ? 'إضافة التجميعة كاملة للسلة' : 'Add Complete Build to Cart'}</span>
            </button>

            {Object.keys(selectedParts).length > 0 && (
              <button
                className="btn btn-ghost btn-apple-tactile"
                style={{ width: '100%', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => setSelectedParts({})}
              >
                <Trash2 size={16} />
                <span>{isRtl ? 'تفريغ كافة القطع' : 'Reset All Parts'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
