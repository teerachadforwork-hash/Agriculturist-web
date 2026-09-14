import { fetchFacilitiesByCrop, fetchPricingRule, fetchTodayPrice } from '../services/api.js';
import { calculatePrice } from '../engine/pricing-engine.js';
import { findFacilitiesWithinRadius, rankFacilitiesByProfit, getGoogleMapsLink } from '../engine/geo-engine.js';


let mapInstance = null;
let currentCrop = 'rice';
let currentRadius = 30;
let userLocation = { lat: 15.1200, lng: 103.2100 };
let rankedFacilities = [];

const cropLabels = {
  rice: 'ข้าวเปลือก',
  cassava: 'มันสำปะหลัง',
  sugarcane: 'อ้อยโรงงาน',
};

function normalizeCrop(crop) {
  return crop === 'cane' ? 'sugarcane' : crop || 'rice';
}

function formatPrice(price, cropId) {
  if (price === null || price === undefined) return 'ไม่พบราคา';
  return cropId === 'sugarcane'
    ? `${Math.round(price).toLocaleString('th-TH')} ฿/ตัน`
    : `${price.toFixed(2)} ฿/กก.`;
}

function renderFacilityCard(facility, index) {
  return `
    <div class="snap-center shrink-0 w-[85vw] max-w-[340px] bg-surface-container-lowest rounded-2xl shadow-lg border border-surface-container-highest p-space-md space-y-3 relative overflow-hidden">
      ${index === 0 ? '<div class="absolute top-0 right-0 px-3 py-1 bg-primary-fixed text-on-primary-fixed font-caption text-caption font-bold rounded-bl-xl">กำไรสุทธิสูงสุด</div>' : ''}
      <div class="flex justify-between items-start ${index === 0 ? 'pt-2' : ''}">
        <div class="min-w-0 pr-16">
          <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface truncate">${facility.name}</h3>
          <p class="font-caption text-caption text-on-surface-variant flex items-center gap-1 mt-0.5">
            <span class="material-symbols-outlined text-[14px] text-primary">verified</span>
            ${facility.typeLabel} • ${facility.province}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 mt-2">
        <div class="bg-surface-container-low rounded-lg p-2 text-center">
          <span class="font-caption text-caption text-on-surface-variant block">ราคา</span>
          <span class="font-body-sm text-body-sm font-bold text-on-surface leading-tight">${formatPrice(facility.facilityPrice, currentCrop)}</span>
        </div>
        <div class="bg-surface-container-low rounded-lg p-2 text-center">
          <span class="font-caption text-caption text-on-surface-variant block">ระยะทาง</span>
          <span class="font-body-sm text-body-sm font-bold text-tertiary leading-tight">${facility.distance.toFixed(1)} กม.</span>
        </div>
        <div class="bg-surface-container-low rounded-lg p-2 text-center">
          <span class="font-caption text-caption text-on-surface-variant block">กำไรสุทธิ</span>
          <span class="font-body-sm text-body-sm font-bold text-primary leading-tight">฿${facility.netProfit.toLocaleString('th-TH')}</span>
        </div>
      </div>

      <div class="flex items-center justify-between pt-1 gap-2">
        <div class="flex items-center gap-1 font-caption text-[11px] text-on-surface-variant min-w-0">
          <span class="material-symbols-outlined text-[14px] text-secondary">local_shipping</span>
          <span class="truncate">ค่าขนส่ง ~฿${facility.transportCost.toLocaleString('th-TH')} • จุ ${facility.capacityTons.toLocaleString('th-TH')} ตัน/วัน</span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <a href="${getGoogleMapsLink(facility.lat, facility.lng)}" target="_blank" rel="noopener" class="px-2.5 py-1.5 bg-surface-container-high text-on-surface font-caption text-caption font-bold rounded-lg active:bg-surface-container">นำทาง</a>
          <a href="#/facility/${facility.id}?crop=${currentCrop}" class="px-2.5 py-1.5 bg-primary text-on-primary font-caption text-caption font-bold rounded-lg shadow-sm active:bg-primary-container">รายละเอียด</a>
        </div>
      </div>
    </div>
  `;
}

export async function renderFacilityMap(params = {}) {
  currentCrop = normalizeCrop(params.crop);
  currentRadius = params.radius ? parseInt(params.radius, 10) : currentRadius;
  userLocation = {
    lat: params.lat ? Number(params.lat) : userLocation.lat,
    lng: params.lng ? Number(params.lng) : userLocation.lng,
  };

  const facilities = await fetchFacilitiesByCrop(currentCrop);
  const market = await fetchTodayPrice(currentCrop);
  const rule = await fetchPricingRule(currentCrop);
  const totalWeightKg = Number(params.weight || 12500);
  const quality = Number(params.moisture || (currentCrop === 'rice' ? 22 : currentCrop === 'cassava' ? 27 : 11.5));
  const basePrice = Number(market?.basePrice);

  if (!Number.isFinite(basePrice)) {
    throw new Error(`No market price available for ${currentCrop}`);
  } const priceResult = calculatePrice(currentCrop, currentCrop === 'sugarcane' ? totalWeightKg / 1000 : totalWeightKg, quality, basePrice, rule);
  const nearby = findFacilitiesWithinRadius(facilities, userLocation.lat, userLocation.lng, currentRadius);
  const candidates = nearby.length > 0
    ? nearby
    : findFacilitiesWithinRadius(facilities, userLocation.lat, userLocation.lng, 9999).slice(0, 6);
  const facilityPricesMap = Object.fromEntries(
    candidates.map(facility => [
      facility.id,
      {
        [currentCrop]: facility.facilityPrice,
      },
    ])
  );

  rankedFacilities = rankFacilitiesByProfit(
    candidates,
    priceResult,
    facilityPricesMap,
    totalWeightKg
  );
  return `
    <div class="flex flex-col w-full h-[100dvh] bg-surface relative overflow-hidden">
      <div id="gis-map" class="absolute inset-0 z-0 bg-surface-container"></div>
      <div class="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-surface/80 to-transparent z-10 pointer-events-none"></div>

      <div class="absolute top-24 inset-x-0 px-margin z-20 flex items-center gap-2">
        <div class="flex-1 h-12 bg-surface-container-lowest/90 backdrop-blur rounded-xl shadow-md flex items-center px-3 border border-surface-container-highest">
          <span class="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
          <input type="text" placeholder="ค้นหาจุดรับซื้อ..." class="w-full h-full bg-transparent border-none outline-none px-2 font-body-sm text-body-sm text-on-surface placeholder-on-surface-variant font-medium" />
        </div>
        <div class="h-12 bg-surface-container-lowest/90 backdrop-blur rounded-xl shadow-md flex items-center px-3 border border-surface-container-highest text-primary font-caption text-caption font-bold">
          ${cropLabels[currentCrop]} • ${currentRadius} กม.
        </div>
      </div>

      <button id="btn-use-location" type="button" class="absolute right-margin bottom-32 w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center z-20 active:scale-95 transition-transform border border-primary-container">
        <span class="material-symbols-outlined text-[24px]">my_location</span>
      </button>

      <div class="absolute bottom-16 inset-x-0 z-30 pb-safe">
        <div class="w-full overflow-x-auto snap-x snap-mandatory flex gap-space-md px-margin pb-4 scrollbar-hide">
          ${rankedFacilities.length > 0
      ? rankedFacilities.map(renderFacilityCard).join('')
      : '<div class="w-[85vw] max-w-[340px] bg-surface-container-lowest rounded-2xl shadow-lg p-space-md text-on-surface">ยังไม่พบลานรับซื้อสำหรับพืชชนิดนี้</div>'}
        </div>
      </div>
    </div>

    <style>
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important; border-radius: 0.75rem !important; overflow: hidden; margin-top: 120px !important; }
      .leaflet-control-zoom a { color: #131b2e !important; background: #ffffff !important; border-color: #eaedff !important; width: 36px !important; height: 36px !important; line-height: 36px !important; }
      .leaflet-popup-content-wrapper { border-radius: 0.75rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
      .leaflet-popup-tip-container { display: none; }
    </style>
  `;
}

export function initMapEvents() {
  setTimeout(() => {
    try {
      if (typeof L === 'undefined') return;
      const mapDiv = document.getElementById('gis-map');
      if (!mapDiv) return;

      mapInstance = L.map('gis-map', {
        zoomControl: true,
        attributionControl: false,
      }).setView([userLocation.lat, userLocation.lng], 9);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);

      const customIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="w-10 h-10 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center border-2 border-white relative">
          <span class="material-symbols-outlined text-[20px]">storefront</span>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rotate-45 border-r-2 border-b-2 border-white"></div>
        </div>`,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
      });

      rankedFacilities.forEach((facility, index) => {
        L.marker([facility.lat, facility.lng], { icon: customIcon }).addTo(mapInstance)
          .bindPopup(`<b>${index + 1}. ${facility.name}</b><br>${formatPrice(facility.facilityPrice, currentCrop)}<br>กำไรสุทธิ ฿${facility.netProfit.toLocaleString('th-TH')}`);
      });

      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div class="w-5 h-5 bg-tertiary rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.9),0_0_12px_rgba(0,92,142,0.6)] relative z-50">
          <div class="absolute inset-0 bg-tertiary rounded-full animate-ping opacity-75"></div>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstance);
      L.circle([userLocation.lat, userLocation.lng], {
        color: '#005c8e',
        fillColor: '#2075ae',
        fillOpacity: 0.1,
        weight: 1,
        radius: currentRadius * 1000,
        dashArray: '5, 5',
      }).addTo(mapInstance);

      if (rankedFacilities.length > 0) {
        const bounds = L.latLngBounds([[userLocation.lat, userLocation.lng], ...rankedFacilities.map(f => [f.lat, f.lng])]);
        mapInstance.fitBounds(bounds.pad(0.2));
      }
    } catch (e) {
      console.warn('Leaflet error:', e);
    }
  }, 200);

  const locationBtn = document.getElementById('btn-use-location');
  if (locationBtn && navigator.geolocation) {
    locationBtn.addEventListener('click', () => {
      navigator.geolocation.getCurrentPosition(position => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        params.set('lat', position.coords.latitude);
        params.set('lng', position.coords.longitude);
        window.location.hash = `#/map?${params.toString()}`;
      });
    });
  }
}

export function destroyMap() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}
