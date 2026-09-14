// ══════════════════════════════════════════════════
// Mock Crops Data — ข้อมูลพืช 3 ชนิด
// ตาม crops_master + pricing_rules ใน specific.md
// ══════════════════════════════════════════════════

export const crops = [
  {
    id: 'rice',
    name: 'ข้าวเปลือก',
    icon: '🌾',
    image: '/assets/rice.jpg',
    color: '#facc15',
    colorRgb: '250, 204, 21',
    stdMoisture: 15,
    stdStarch: null,
    stdCcs: null,
    unit: 'กิโลกรัม',
    priceUnit: 'บาท/กก.',
    qualityLabel: 'ความชื้น (%)',
    qualityKey: 'moisture',
    qualityMin: 10,
    qualityMax: 35,
    qualityStep: 0.5,
    qualityDefault: 22,
    description: 'ข้าวเปลือกที่เกี่ยวสดมีความชื้น 25-30% ราคามาตรฐานอ้างอิงที่ความชื้น 15% หักน้ำหนัก 1.5% ต่อความชื้นเกิน 1%',
    formula: 'หักน้ำหนัก = (ความชื้น - 15) × 15 × (น้ำหนัก/1000)',
  },
  {
    id: 'cassava',
    name: 'มันสำปะหลัง',
    icon: '🥔',
    image: '/assets/cassava.jpg',
    color: '#c68638',
    colorRgb: '198, 134, 56',
    stdMoisture: null,
    stdStarch: 25,
    stdCcs: null,
    unit: 'กิโลกรัม',
    priceUnit: 'บาท/กก.',
    qualityLabel: 'เชื้อแป้ง (%)',
    qualityKey: 'starch',
    qualityMin: 15,
    qualityMax: 35,
    qualityStep: 0.5,
    qualityDefault: 25,
    description: 'ราคามาตรฐานอ้างอิงที่เชื้อแป้ง 25% ปรับราคา 0.10 บาท/กก. ต่อเชื้อแป้ง 1%',
    formula: 'ราคาปรับ = ราคาฐาน + (เชื้อแป้ง - 25) × อัตราปรับ',
  },
  {
    id: 'sugarcane',
    name: 'อ้อย',
    icon: '🎋',
    image: '/assets/sugarcane.jpg',
    color: '#16b460',
    colorRgb: '22, 180, 96',
    stdMoisture: null,
    stdStarch: null,
    stdCcs: 10,
    unit: 'ตัน',
    priceUnit: 'บาท/ตัน',
    qualityLabel: 'ค่า C.C.S.',
    qualityKey: 'ccs',
    qualityMin: 5,
    qualityMax: 18,
    qualityStep: 0.1,
    qualityDefault: 10,
    description: 'ค่าอ้อยอ้างอิงที่ 10 C.C.S. ปรับขึ้น-ลง 53.40 บาท/ตัน ต่อ 1 หน่วย C.C.S.',
    formula: 'ราคาสุดท้าย = ราคาฐาน + (C.C.S. - 10) × 53.40',
  },
];

// Pricing Rules — กฎเกณฑ์การคำนวณ (ดึงจาก DB ในระบบจริง)
export const pricingRules = [
  {
    id: 'rule-rice-01',
    cropId: 'rice',
    ruleType: 'moisture_deduction',
    deductionRate: 1.5,       // หัก 1.5% ของน้ำหนัก ต่อความชื้นเกิน 1%
    standardValue: 15,        // ความชื้นมาตรฐาน
    effectiveDate: '2026-01-01',
    endDate: null,            // ยังมีผลอยู่
  },
  {
    id: 'rule-cassava-01',
    cropId: 'cassava',
    ruleType: 'starch_adjustment',
    deductionRate: 0.10,      // ปรับ 0.10 บาท/กก./แป้ง 1%
    standardValue: 25,        // เชื้อแป้งมาตรฐาน
    effectiveDate: '2026-01-01',
    endDate: null,
  },
  {
    id: 'rule-sugarcane-01',
    cropId: 'sugarcane',
    ruleType: 'ccs_adjustment',
    deductionRate: 53.40,     // ปรับ 53.40 บาท/ตัน/CCS 1 หน่วย
    standardValue: 10,        // CCS มาตรฐาน
    effectiveDate: '2026-01-01',
    endDate: null,
  },
];

export function getCropById(id) {
  return crops.find(c => c.id === id);
}

export function getActivePricingRule(cropId) {
  const now = new Date().toISOString().split('T')[0];
  return pricingRules.find(r =>
    r.cropId === cropId &&
    r.effectiveDate <= now &&
    (r.endDate === null || r.endDate >= now)
  );
}
