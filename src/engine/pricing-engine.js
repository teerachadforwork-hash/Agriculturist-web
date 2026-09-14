// ══════════════════════════════════════════════════
// Pricing Engine — สูตรคำนวณราคา 3 ชนิดพืช
// ตาม specific.md — ราคาฐานดึงจาก data layer ไม่ hardcode
// ══════════════════════════════════════════════════

/**
 * คำนวณราคาข้าวเปลือก (หักน้ำหนักจากความชื้น)
 * สูตร: excess = moisture - 15
 *        deduction = excess × 15 × (weight / 1000)
 *        netWeight = weight - deduction
 *        netPrice  = netWeight × basePrice
 *
 * @param {number} totalWeight - น้ำหนักรวม (กก.)
 * @param {number} moisture    - ความชื้นวัดได้ (%)
 * @param {number} basePrice   - ราคาฐานที่ความชื้น 15% (บาท/กก.)
 * @param {number} deductionRate - อัตราหักต่อความชื้นเกิน 1% (default: 1.5%)
 * @returns {object} ผลคำนวณ
 */
export function calculateRicePrice(totalWeight, moisture, basePrice, deductionRate = 1.5) {
  const standardMoisture = 15;
  const excessMoisture = Math.max(0, moisture - standardMoisture);
  const weightDeduction = excessMoisture * (deductionRate * 10) * (totalWeight / 1000);
  // deductionRate 1.5% = 15 กก./ตัน/ชื้น 1% → 1.5 * 10 = 15
  const netWeight = totalWeight - weightDeduction;
  const netPrice = netWeight * basePrice;

  return {
    cropType: 'rice',
    totalWeight,
    moisture,
    standardMoisture,
    excessMoisture,
    deductionRate,
    weightDeduction: Math.round(weightDeduction * 100) / 100,
    netWeight: Math.round(netWeight * 100) / 100,
    basePrice,
    pricePerUnit: basePrice,
    netPrice: Math.round(netPrice * 100) / 100,
    unit: 'กก.',
    priceUnit: 'บาท/กก.',
    breakdown: [
      { label: 'น้ำหนักรวม', value: `${totalWeight.toLocaleString()} กก.` },
      { label: 'ความชื้นวัดได้', value: `${moisture}%` },
      { label: 'ความชื้นมาตรฐาน', value: `${standardMoisture}%` },
      { label: 'ความชื้นเกิน', value: `${excessMoisture.toFixed(1)}%`, highlight: excessMoisture > 0 },
      { label: 'น้ำหนักที่ถูกหัก', value: `${Math.round(weightDeduction).toLocaleString()} กก.`, highlight: weightDeduction > 0 },
      { label: 'น้ำหนักสุทธิ', value: `${Math.round(netWeight).toLocaleString()} กก.`, important: true },
      { label: 'ราคาฐาน (ที่ 15%)', value: `${basePrice.toFixed(2)} บาท/กก.` },
      { label: 'รายได้คาดการณ์', value: `${Math.round(netPrice).toLocaleString()} บาท`, important: true },
    ],
  };
}

/**
 * คำนวณราคามันสำปะหลัง (ปรับราคาตามเชื้อแป้ง)
 * สูตร: diff = starch - 25
 *        adjustedPrice = basePrice + (diff × adjustRate)
 *        revenue = weight × adjustedPrice
 *
 * @param {number} totalWeight  - น้ำหนักรวม (กก.)
 * @param {number} starch       - เชื้อแป้งวัดได้ (%)
 * @param {number} basePrice    - ราคาฐานที่แป้ง 25% (บาท/กก.)
 * @param {number} adjustRate   - อัตราปรับต่อแป้ง 1% (บาท/กก.) default: 0.10
 * @returns {object} ผลคำนวณ
 */
export function calculateCassavaPrice(totalWeight, starch, basePrice, adjustRate = 0.10) {
  const standardStarch = 25;
  const starchDifference = starch - standardStarch;
  const priceAdjustment = starchDifference * adjustRate;
  const adjustedPrice = basePrice + priceAdjustment;
  const netRevenue = totalWeight * adjustedPrice;

  return {
    cropType: 'cassava',
    totalWeight,
    starch,
    standardStarch,
    starchDifference,
    adjustRate,
    priceAdjustment: Math.round(priceAdjustment * 100) / 100,
    adjustedPrice: Math.round(adjustedPrice * 100) / 100,
    basePrice,
    pricePerUnit: Math.round(adjustedPrice * 100) / 100,
    netPrice: Math.round(netRevenue * 100) / 100,
    netWeight: totalWeight, // มันไม่หักน้ำหนัก หักที่ราคา
    unit: 'กก.',
    priceUnit: 'บาท/กก.',
    breakdown: [
      { label: 'น้ำหนักรวม', value: `${totalWeight.toLocaleString()} กก.` },
      { label: 'เชื้อแป้งวัดได้', value: `${starch}%` },
      { label: 'เชื้อแป้งมาตรฐาน', value: `${standardStarch}%` },
      { label: 'ส่วนต่างเชื้อแป้ง', value: `${starchDifference > 0 ? '+' : ''}${starchDifference.toFixed(1)}%`, highlight: starchDifference !== 0 },
      { label: 'ราคาฐาน (ที่ 25%)', value: `${basePrice.toFixed(2)} บาท/กก.` },
      { label: 'ปรับราคา', value: `${priceAdjustment > 0 ? '+' : ''}${priceAdjustment.toFixed(2)} บาท/กก.`, highlight: true },
      { label: 'ราคาสุทธิต่อ กก.', value: `${adjustedPrice.toFixed(2)} บาท/กก.`, important: true },
      { label: 'รายได้คาดการณ์', value: `${Math.round(netRevenue).toLocaleString()} บาท`, important: true },
    ],
  };
}

/**
 * คำนวณราคาอ้อย (ปรับตาม C.C.S.)
 * สูตร: diff = ccs - 10
 *        adjustment = diff × 53.40
 *        finalPrice = basePrice + adjustment
 *        revenue = weight × finalPrice
 * *** basePrice ดึงจาก pricing_rules/daily_market_prices ไม่ hardcode ***
 *
 * @param {number} totalWeight - น้ำหนักรวม (ตัน)
 * @param {number} ccs        - ค่า C.C.S. วัดได้
 * @param {number} basePrice  - ราคาฐานที่ 10 CCS (บาท/ตัน) — จาก DB
 * @param {number} ccsRate    - อัตราปรับต่อ CCS (default: 53.40)
 * @returns {object} ผลคำนวณ
 */
export function calculateSugarcanePrice(totalWeight, ccs, basePrice, ccsRate = 53.40) {
  const standardCcs = 10;
  const ccsDifference = ccs - standardCcs;
  const priceAdjustment = ccsDifference * ccsRate;
  const finalPricePerTon = basePrice + priceAdjustment;
  const netRevenue = totalWeight * finalPricePerTon;

  return {
    cropType: 'sugarcane',
    totalWeight,
    ccs,
    standardCcs,
    ccsDifference,
    ccsRate,
    priceAdjustment: Math.round(priceAdjustment * 100) / 100,
    finalPricePerTon: Math.round(finalPricePerTon * 100) / 100,
    basePrice,
    pricePerUnit: Math.round(finalPricePerTon * 100) / 100,
    netPrice: Math.round(netRevenue * 100) / 100,
    netWeight: totalWeight,
    unit: 'ตัน',
    priceUnit: 'บาท/ตัน',
    breakdown: [
      { label: 'น้ำหนักรวม', value: `${totalWeight.toLocaleString()} ตัน` },
      { label: 'C.C.S. วัดได้', value: `${ccs}` },
      { label: 'C.C.S. มาตรฐาน', value: `${standardCcs}` },
      { label: 'ส่วนต่าง C.C.S.', value: `${ccsDifference > 0 ? '+' : ''}${ccsDifference.toFixed(1)}`, highlight: ccsDifference !== 0 },
      { label: 'ราคาฐาน (ที่ 10 CCS)', value: `${basePrice.toLocaleString()} บาท/ตัน` },
      { label: 'ปรับราคา', value: `${priceAdjustment > 0 ? '+' : ''}${priceAdjustment.toFixed(2)} บาท/ตัน`, highlight: true },
      { label: 'ราคาสุทธิต่อตัน', value: `${Math.round(finalPricePerTon).toLocaleString()} บาท/ตัน`, important: true },
      { label: 'รายได้คาดการณ์', value: `${Math.round(netRevenue).toLocaleString()} บาท`, important: true },
    ],
  };
}

/**
 * เรียกคำนวณตาม crop type อัตโนมัติ
 */
export function calculatePrice(cropId, totalWeight, qualityValue, basePrice, rule) {
  const rate = rule ? rule.deductionRate : undefined;

  switch (cropId) {
    case 'rice':
      return calculateRicePrice(totalWeight, qualityValue, basePrice, rate || 1.5);
    case 'cassava':
      return calculateCassavaPrice(totalWeight, qualityValue, basePrice, rate || 0.10);
    case 'sugarcane':
      return calculateSugarcanePrice(totalWeight, qualityValue, basePrice, rate || 53.40);
    default:
      throw new Error(`Unknown crop type: ${cropId}`);
  }
}
