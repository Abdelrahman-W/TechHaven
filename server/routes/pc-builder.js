import { Router } from 'express';
import { db } from '../lib/supabase.js';

const router = Router();

// ── GET /api/pc-builder/slots ───────────────────────────
router.get('/slots', (_req, res) => {
  const slots = [
    { key: 'cpu', name: 'المعالج (CPU)', nameEn: 'Processor (CPU)', icon: 'Cpu', category: 'cat-cpu', required: true },
    { key: 'motherboard', name: 'اللوحة الأم (Motherboard)', nameEn: 'Motherboard', icon: 'Layers', category: 'cat-motherboards', required: true },
    { key: 'gpu', name: 'كارت الشاشة (GPU)', nameEn: 'Graphics Card (GPU)', icon: 'Monitor', category: 'cat-gpu', required: true },
    { key: 'ram', name: 'الذاكرة العشوائية (RAM)', nameEn: 'Memory (RAM)', icon: 'MemoryStick', category: 'cat-ram', required: true },
    { key: 'storage', name: 'وحدة التخزين (SSD / NVMe)', nameEn: 'Primary Storage (SSD)', icon: 'HardDrive', category: 'cat-storage', required: true },
    { key: 'psu', name: 'مزود الطاقة (Power Supply)', nameEn: 'Power Supply (PSU)', icon: 'Zap', category: 'cat-psu', required: true },
    { key: 'case', name: 'صندوق الجهاز (PC Case)', nameEn: 'Computer Case', icon: 'Box', category: 'cat-cases', required: true },
    { key: 'cooler', name: 'المبرد (CPU Cooler)', nameEn: 'CPU Cooler', icon: 'Fan', category: 'cat-cooling', required: false },
  ];
  res.json({ success: true, data: slots });
});

// ── POST /api/pc-builder/validate ───────────────────────
// Validates compatibility of a configured PC build
router.post('/validate', async (req, res) => {
  try {
    const parts = req.body.parts || req.body || {}; // { cpuId, mbId, ramId, gpuId, psuId, caseId, coolerId, storageId }

    const warnings = [];
    const errors = [];
    let totalWattage = 100; // Base motherboard + peripherals

    let cpu = null, mb = null, ram = null, gpu = null, psu = null;

    if (parts.cpuId) cpu = await db.getProduct(parts.cpuId);
    if (parts.mbId) mb = await db.getProduct(parts.mbId);
    if (parts.ramId) ram = await db.getProduct(parts.ramId);
    if (parts.gpuId) gpu = await db.getProduct(parts.gpuId);
    if (parts.psuId) psu = await db.getProduct(parts.psuId);

    // 1. CPU & Motherboard Socket Check
    if (cpu && mb) {
      const cpuSocket = cpu.specs?.['المقبس (Socket)'] || (cpu.name.includes('AMD') || cpu.name.includes('7800') ? 'AM5' : 'LGA1700');
      const mbSocket = mb.specs?.['المقبس (Socket)'] || (mb.name.includes('B650') || mb.name.includes('X670') ? 'AM5' : 'LGA1700');

      if (cpuSocket !== mbSocket) {
        errors.push(`غير متوافق: المعالج بمقبس (${cpuSocket}) واللوحة الأم بمقبس (${mbSocket}). لا يمكن تركيبهما معاً.`);
      }
    }

    // 2. RAM & Motherboard Compatibility
    if (ram && mb) {
      const ramType = ram.specs?.['نوع الرام'] || (ram.name.includes('DDR5') ? 'DDR5' : 'DDR4');
      const mbRamType = mb.specs?.['نوع الرام'] || (mb.name.includes('DDR5') ? 'DDR5' : 'DDR4');

      if (ramType && mbRamType && !mbRamType.includes(ramType)) {
        errors.push(`غير متوافق: الرام من نوع (${ramType}) واللوحة الأم تتطلب (${mbRamType}).`);
      }
    }

    // 3. Wattage Calculation
    if (cpu) {
      if (cpu.name.includes('14900K') || cpu.name.includes('13900K')) totalWattage += 280;
      else if (cpu.name.includes('14700K')) totalWattage += 240;
      else if (cpu.name.includes('7800X3D')) totalWattage += 120;
      else totalWattage += 130;
    }

    if (gpu) {
      if (gpu.name.includes('4090')) totalWattage += 450;
      else if (gpu.name.includes('4080')) totalWattage += 320;
      else if (gpu.name.includes('4070')) totalWattage += 220;
      else if (gpu.name.includes('4060')) totalWattage += 140;
      else totalWattage += 200;
    }

    const recommendedPsuWattage = Math.ceil((totalWattage * 1.3) / 50) * 50; // 30% safety headroom

    if (psu) {
      const psuWatts = parseInt(psu.specs?.['القدرة (Wattage)'] || psu.name.match(/\d{3,4}W/i)?.[0] || '750');
      if (psuWatts < totalWattage) {
        errors.push(`طاقة غير كافية: مزود الطاقة بقدرة (${psuWatts}W) أقل من إجمالي استهلاك التجميعة المقدر (${totalWattage}W).`);
      } else if (psuWatts < recommendedPsuWattage) {
        warnings.push(`تنبيه: مزود الطاقة (${psuWatts}W) يكفي بالحد الأدنى، لكن نوصي بـ (${recommendedPsuWattage}W) لأفضل كفاءة وأمان.`);
      }
    }

    const isCompatible = errors.length === 0;

    res.json({
      success: true,
      compatible: isCompatible,
      estimated_wattage: totalWattage,
      recommended_psu_wattage: recommendedPsuWattage,
      errors,
      warnings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
