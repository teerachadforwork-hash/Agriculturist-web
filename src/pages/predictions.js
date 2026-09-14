import { fetchAiWarnings, fetchPredictions, fetchTodayPrice } from '../services/api.js';

let selectedCrop = 'rice';

const crops = [
  { id: 'rice', label: 'ข้าว', icon: 'eco' },
  { id: 'cassava', label: 'มัน', icon: 'nutrition' },
  { id: 'sugarcane', label: 'อ้อย', icon: 'grass' },
];

function buildChart(data) {
  if (!data.length) return '';
  const values = data.slice(0, 30).map(d => d.predictedPrice);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 90 - ((value - min) / range) * 75;
    return `${x},${y}`;
  }).join(' ');
  return `
    <svg class="w-full h-full text-primary" preserveAspectRatio="none" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="${points}" vector-effect="non-scaling-stroke"></polyline>
      <polygon points="0,100 ${points} 100,100" fill="currentColor" fill-opacity="0.1" stroke="none"></polygon>
    </svg>
  `;
}

function trendLabel(today, target) {
  const diff = target - today;
  if (Math.abs(diff) < 0.01) return ['ทรงตัว', 'schedule', 'text-on-surface'];
  return diff > 0 ? ['ขาขึ้น', 'trending_up', 'text-primary'] : ['ขาลง', 'trending_down', 'text-error'];
}

export async function renderPredictions(params = {}) {
  selectedCrop = params.crop || selectedCrop;
  const data = await fetchPredictions(selectedCrop);
  const market = await fetchTodayPrice(selectedCrop);
  const warnings = await fetchAiWarnings();
  const warning = warnings.find(item => item.cropId === selectedCrop);
  const target = data[14]?.predictedPrice || market?.basePrice || 0;
  const current = market?.basePrice || data[0]?.predictedPrice || 0;
  const [label, icon, color] = trendLabel(current, target);
  const changePercent = current ? ((target - current) / current) * 100 : 0;
  const cropName = warning?.cropName || crops.find(c => c.id === selectedCrop)?.label || selectedCrop;

  return `
    <div class="flex flex-col w-full space-y-space-md pt-20 pb-24 max-w-xl mx-auto px-margin">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[28px]">trending_up</span>
          <h1 class="font-headline-lg text-headline-lg font-bold text-on-surface">เตือนภัยราคาล่วงหน้า</h1>
        </div>
        <span class="font-caption text-caption font-bold bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">auto_awesome</span> AI วิเคราะห์
        </span>
      </div>

      <div class="grid grid-cols-3 gap-space-xs bg-surface-container-low p-1.5 rounded-xl">
        ${crops.map(crop => `
          <button type="button" data-crop="${crop.id}" class="prediction-crop-btn py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 font-body-sm text-body-sm font-bold ${crop.id === selectedCrop ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest text-on-surface'}">
            <span class="material-symbols-outlined text-[19px]">${crop.icon}</span>${crop.label}
          </button>
        `).join('')}
      </div>

      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-md space-y-space-sm relative overflow-hidden">
        <div class="flex justify-between items-start relative z-10">
          <div>
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold">แนวโน้มราคา${cropName}</h2>
            <p class="font-caption text-caption text-on-surface-variant">พยากรณ์ล่วงหน้า 30 วัน จากข้อมูลราคาและฤดูกาล</p>
          </div>
          <div class="text-right">
            <span class="font-display-lg-mobile text-display-lg-mobile font-bold ${color} block leading-none flex items-center justify-end gap-1">
              <span class="material-symbols-outlined text-[28px]">${icon}</span>${label}
            </span>
            <span class="font-caption text-caption text-secondary font-bold">${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}% ใน 15 วัน</span>
          </div>
        </div>

        <div class="h-48 bg-surface-container-low rounded-lg mt-4 flex items-center justify-center border border-surface-container-high relative overflow-hidden">
          ${buildChart(data)}
        </div>

        <div class="grid grid-cols-2 gap-space-sm pt-2">
          <div class="bg-surface-container p-3 rounded-xl border-l-4 border-primary">
            <span class="font-caption text-caption text-on-surface-variant block">ราคาปัจจุบัน</span>
            <span class="font-body-lg text-body-lg font-bold text-on-surface">${current.toLocaleString('th-TH', { maximumFractionDigits: 2 })} <small class="font-body-sm font-normal">${market?.unit || 'บาท'}</small></span>
          </div>
          <div class="bg-surface-container p-3 rounded-xl border-l-4 border-secondary">
            <span class="font-caption text-caption text-on-surface-variant block">เป้าหมายอีก 15 วัน</span>
            <span class="font-body-lg text-body-lg font-bold text-secondary">${target.toLocaleString('th-TH', { maximumFractionDigits: 2 })} <small class="font-body-sm font-normal">${market?.unit || 'บาท'}</small></span>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-md flex gap-4 items-center">
        <div class="w-12 h-12 rounded-full bg-secondary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <span class="material-symbols-outlined text-[24px]">front_loader</span>
        </div>
        <div>
          <h3 class="font-body-lg text-body-lg font-bold text-on-surface leading-tight">คำแนะนำจาก AI</h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">${warning?.recommendation || 'ติดตามราคาประจำวันและเปรียบเทียบลานรับซื้อก่อนตัดสินใจขาย'}</p>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-md space-y-space-sm">
        <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface flex items-center gap-2">
          <span class="material-symbols-outlined text-[20px] text-tertiary">campaign</span>สัญญาณเฝ้าระวัง
        </h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">${warning?.description || 'ยังไม่มีสัญญาณผิดปกติสำหรับพืชชนิดนี้'}</p>
      </section>
    </div>
  `;
}

export function initPredictionsEvents() {
  document.querySelectorAll('.prediction-crop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `#/predictions?crop=${btn.dataset.crop}`;
    });
  });
}

export function destroyPredictions() {}
