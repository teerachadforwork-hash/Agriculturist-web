// ══════════════════════════════════════════════════
// Transport Cost Estimation — ประมาณค่าขนส่ง
// ══════════════════════════════════════════════════

// อัตราค่าขนส่งโดยประมาณ (บาท/กิโลเมตร/ตัน)
const TRANSPORT_RATE_PER_KM_PER_TON = 3.5;
const BASE_COST = 200; // ค่าคงที่เริ่มต้น (บาท)

/**
 * ประมาณต้นทุนขนส่ง
 * @param {number} distanceKm - ระยะทาง (กิโลเมตร)
 * @param {number} weightTons - น้ำหนัก (ตัน)
 * @returns {number} ต้นทุนขนส่งโดยประมาณ (บาท)
 */
export function estimateTransportCost(distanceKm, weightTons) {
  if (distanceKm <= 0 || weightTons <= 0) return 0;
  return BASE_COST + (distanceKm * weightTons * TRANSPORT_RATE_PER_KM_PER_TON);
}

/**
 * แสดงรายละเอียดต้นทุนขนส่ง
 */
export function getTransportCostBreakdown(distanceKm, weightTons) {
  const variableCost = distanceKm * weightTons * TRANSPORT_RATE_PER_KM_PER_TON;
  const totalCost = BASE_COST + variableCost;

  return {
    baseCost: BASE_COST,
    variableCost: Math.round(variableCost),
    totalCost: Math.round(totalCost),
    ratePerKmPerTon: TRANSPORT_RATE_PER_KM_PER_TON,
    distanceKm,
    weightTons,
    description: `ค่าเริ่มต้น ${BASE_COST} บาท + (${distanceKm.toFixed(1)} กม. × ${weightTons.toFixed(1)} ตัน × ${TRANSPORT_RATE_PER_KM_PER_TON} บาท)`,
  };
}
