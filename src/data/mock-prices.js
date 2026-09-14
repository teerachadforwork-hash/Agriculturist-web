// ══════════════════════════════════════════════════
// Mock Prices — ราคากลาง + AI Predictions
// จำลองข้อมูลจาก DIT/OAE + AI Warning Engine
// ══════════════════════════════════════════════════

// ราคากลางล่าสุด (daily_market_prices)
export const todayPrices = {
  rice: {
    cropId: 'rice',
    basePrice: 9.50,          // บาท/กก. ที่ความชื้น 15%
    unit: 'บาท/กก.',
    change: +0.15,
    changePercent: +1.6,
    date: '2026-09-14',
    source: 'กรมการค้าภายใน',
  },
  cassava: {
    cropId: 'cassava',
    basePrice: 2.85,          // บาท/กก. ที่แป้ง 25%
    unit: 'บาท/กก.',
    change: -0.05,
    changePercent: -1.7,
    date: '2026-09-14',
    source: 'กรมการค้าภายใน',
  },
  sugarcane: {
    cropId: 'sugarcane',
    basePrice: 890,           // บาท/ตัน ที่ 10 CCS
    unit: 'บาท/ตัน',
    change: +5.00,
    changePercent: +0.6,
    date: '2026-09-14',
    source: 'ราชกิจจานุเบกษา (ราคาอ้อยขั้นต้น)',
  },
};

// ราคารับซื้อหน้าลาน (facility-specific prices)
export const facilityPrices = {
  'fac-001': { rice: 9.40 },
  'fac-002': { rice: 9.55 },
  'fac-003': { rice: 9.35 },
  'fac-004': { rice: 9.20 },
  'fac-005': { rice: 9.60 },
  'fac-006': { rice: 9.45 },
  'fac-007': { rice: 9.30 },
  'fac-101': { cassava: 2.80 },
  'fac-102': { cassava: 2.90 },
  'fac-103': { cassava: 2.70 },
  'fac-104': { cassava: 2.95 },
  'fac-105': { cassava: 2.85 },
  'fac-201': { sugarcane: 900 },
  'fac-202': { sugarcane: 895 },
  'fac-203': { sugarcane: 885 },
  'fac-204': { sugarcane: 880 },
  'fac-205': { sugarcane: 910 },
  'fac-206': { sugarcane: 875 },
};

// สร้างข้อมูลราคาย้อนหลัง 6 เดือน
function generateHistoricalPrices() {
  const data = { rice: [], cassava: [], sugarcane: [] };
  const baseValues = { rice: 9.0, cassava: 2.5, sugarcane: 850 };
  const volatility = { rice: 0.4, cassava: 0.2, sugarcane: 25 };

  const today = new Date();
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Simulate seasonal patterns
    const seasonFactor = Math.sin((i / 180) * Math.PI * 2) * 0.5;

    for (const crop of ['rice', 'cassava', 'sugarcane']) {
      const base = baseValues[crop];
      const vol = volatility[crop];
      const noise = (Math.random() - 0.5) * vol * 0.3;
      const trend = (180 - i) / 180 * vol * 0.5; // Slight uptrend
      const price = base + seasonFactor * vol + trend + noise;

      data[crop].push({
        date: dateStr,
        price: Math.round(price * 100) / 100,
      });
    }
  }
  return data;
}

export const historicalPrices = generateHistoricalPrices();

// AI Predictions — พยากรณ์ 3 เดือนข้างหน้า
function generatePredictions() {
  const data = { rice: [], cassava: [], sugarcane: [] };
  const lastPrices = {
    rice: todayPrices.rice.basePrice,
    cassava: todayPrices.cassava.basePrice,
    sugarcane: todayPrices.sugarcane.basePrice,
  };
  const trends = { rice: 0.02, cassava: -0.01, sugarcane: 0.5 };
  const volatility = { rice: 0.15, cassava: 0.08, sugarcane: 10 };

  const today = new Date();
  for (let i = 1; i <= 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    for (const crop of ['rice', 'cassava', 'sugarcane']) {
      const noise = (Math.random() - 0.5) * volatility[crop] * 0.5;
      const price = lastPrices[crop] + trends[crop] * i / 30 + noise;
      const confidence = Math.max(50, 95 - i * 0.4);

      data[crop].push({
        date: dateStr,
        predictedPrice: Math.round(price * 100) / 100,
        confidenceUpper: Math.round((price * 1.05) * 100) / 100,
        confidenceLower: Math.round((price * 0.95) * 100) / 100,
        confidence: Math.round(confidence),
      });
    }
  }
  return data;
}

export const predictions = generatePredictions();

// AI Warning Levels
export const aiWarnings = [
  {
    id: 'warn-001',
    cropId: 'cassava',
    cropName: 'มันสำปะหลัง',
    cropIcon: '🥔',
    warningLevel: 'danger',
    warningLabel: 'วิกฤต',
    title: 'ราคามันสำปะหลังมีแนวโน้มลดลง 15% ใน 2 เดือนข้างหน้า',
    description: 'ผลผลิตในภาคอีสานเข้าสู่ตลาดพร้อมกันในช่วง พ.ย.-ธ.ค. ทำให้อุปทานล้นตลาด แนะนำเจรจาราคาล่วงหน้ากับลานมันหรือพิจารณาชะลอการขุด',
    predictedDate: '2026-11-15',
    createdAt: '2026-09-10',
    recommendation: 'แนะนำชะลอการขุดมัน 2-3 สัปดาห์ หรือเจรจาราคาล่วงหน้ากับลานมันที่มีสัญญา',
  },
  {
    id: 'warn-002',
    cropId: 'rice',
    cropName: 'ข้าวเปลือก',
    cropIcon: '🌾',
    warningLevel: 'warning',
    warningLabel: 'เฝ้าระวัง',
    title: 'ราคาข้าวอาจผันผวนช่วงปลายฤดูนาปี',
    description: 'ผลผลิตข้าวนาปีจะเริ่มออกสู่ตลาดในช่วง ต.ค.-พ.ย. ราคาอาจปรับลดลง 5-8% ชั่วคราว ก่อนกลับมาฟื้นตัว',
    predictedDate: '2026-10-20',
    createdAt: '2026-09-12',
    recommendation: 'หากไม่เร่งด่วน แนะนำรอขาย 2-3 สัปดาห์หลังช่วง peak supply',
  },
  {
    id: 'warn-003',
    cropId: 'sugarcane',
    cropName: 'อ้อย',
    cropIcon: '🎋',
    warningLevel: 'success',
    warningLabel: 'ปกติ',
    title: 'ราคาอ้อยมีเสถียรภาพดี',
    description: 'ราคาอ้อยขั้นต้นปีนี้ประกาศที่ 890 บาท/ตัน แนวโน้มราคาอ้อยขั้นสุดท้ายจะสูงกว่าขั้นต้น 5-8% จากราคาน้ำตาลโลกที่แข็งแกร่ง',
    predictedDate: '2026-12-31',
    createdAt: '2026-09-14',
    recommendation: 'สถานการณ์ดี ส่งอ้อยเข้าโรงงานได้ตามปกติ',
  },
];

// Weekly sparkline data for dashboard (7 days)
export const weeklySparklines = {
  rice: [9.20, 9.25, 9.35, 9.30, 9.40, 9.45, 9.50],
  cassava: [2.95, 2.92, 2.88, 2.90, 2.87, 2.83, 2.85],
  sugarcane: [880, 882, 885, 888, 885, 890, 890],
};

export function getFacilityPrice(facilityId, cropId) {
  const prices = facilityPrices[facilityId];
  return prices ? prices[cropId] || null : null;
}

export function getTodayPrice(cropId) {
  return todayPrices[cropId] || null;
}
