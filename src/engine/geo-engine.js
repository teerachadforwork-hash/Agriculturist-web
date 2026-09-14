// ══════════════════════════════════════════════════
// Geo Engine — การค้นหาเชิงพื้นที่ (จำลอง PostGIS)
// ใช้ Haversine formula แทน ST_DWithin
// ══════════════════════════════════════════════════

import { estimateTransportCost } from './transport-cost.js';

/**
 * คำนวณระยะทาง Haversine ระหว่างจุด 2 จุด (กิโลเมตร)
 * จำลอง PostGIS ST_Distance + geography
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * ค้นหา facilities ภายในรัศมี (จำลอง ST_DWithin)
 * @param {Array} facilities - รายการ facilities
 * @param {number} userLat - ละติจูดผู้ใช้
 * @param {number} userLng - ลองจิจูดผู้ใช้
 * @param {number} radiusKm - รัศมี (กิโลเมตร)
 * @returns {Array} facilities ที่อยู่ในรัศมี พร้อมระยะทาง
 */
export function findFacilitiesWithinRadius(facilities, userLat, userLng, radiusKm) {
  return facilities
    .map(facility => {
      const distance = haversineDistance(userLat, userLng, facility.lat, facility.lng);
      return {
        ...facility,
        distance: Math.round(distance * 10) / 10,
      };
    })
    .filter(f => f.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * จัดเรียง facilities ตามกำไรสุทธิสูงสุด
 * กำไรสุทธิ = ราคาสุทธิ - ต้นทุนขนส่ง
 * จำลอง PostGIS KNN operator <->
 *
 * @param {Array} facilitiesInRadius - facilities ที่อยู่ในรัศมี
 * @param {object} priceResult - ผลคำนวณราคาจาก pricing engine
 * @param {object} facilityPrices - ราคาเฉพาะของแต่ละลาน
 * @param {number} totalWeight - น้ำหนักรวม (ตัน)
 * @returns {Array} facilities จัดเรียงตามกำไรสุทธิ
 */
export function rankFacilitiesByProfit(facilitiesInRadius, priceResult, facilityPricesMap, totalWeight) {
  const cropId = priceResult.cropType;

  return facilitiesInRadius
    .map(facility => {
      // ดึงราคาเฉพาะลาน
      const facPrices = facilityPricesMap[facility.id];
      const facPrice = facPrices ? facPrices[cropId] : null;

      // ประมาณต้นทุนขนส่ง
      const weightInTons = cropId === 'sugarcane' ? totalWeight : totalWeight / 1000;
      const transportCost = estimateTransportCost(facility.distance, weightInTons);

      // คำนวณรายได้ที่ลานนี้
      let facilityRevenue;
      if (facPrice && cropId === 'rice') {
        // สำหรับข้าว: ใช้ netWeight × ราคาลาน
        facilityRevenue = priceResult.netWeight * facPrice;
      } else if (facPrice && cropId === 'cassava') {
        // สำหรับมัน: คำนวณราคาปรับใหม่ตามราคาลาน
        const starchDiff = priceResult.starchDifference;
        const adjustedFacPrice = facPrice + (starchDiff * priceResult.adjustRate);
        facilityRevenue = totalWeight * adjustedFacPrice;
      } else if (facPrice && cropId === 'sugarcane') {
        // สำหรับอ้อย: ใช้ราคาลาน + CCS adjustment
        const ccsDiff = priceResult.ccsDifference;
        const facFinalPrice = facPrice + (ccsDiff * priceResult.ccsRate);
        facilityRevenue = totalWeight * facFinalPrice;
      } else {
        facilityRevenue = priceResult.netPrice;
      }

      const netProfit = facilityRevenue - transportCost;

      return {
        ...facility,
        facilityPrice: facPrice,
        transportCost: Math.round(transportCost),
        facilityRevenue: Math.round(facilityRevenue),
        netProfit: Math.round(netProfit),
        profitDifference: Math.round(netProfit - (priceResult.netPrice - transportCost)),
      };
    })
    .sort((a, b) => b.netProfit - a.netProfit);
}

/**
 * สร้าง Google Maps navigation link
 */
export function getGoogleMapsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
