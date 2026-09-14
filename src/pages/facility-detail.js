import { fetchFacilities, fetchFacilityPrice, fetchPricingRule, fetchTodayPrice, saveReview, saveTransaction } from '../services/api.js';
import { calculatePrice } from '../engine/pricing-engine.js';
import { getUser } from '../auth.js';

let detailContext = null;

const cropMeta = {
  rice: { name: 'ข้าวเปลือกหอมมะลิ', icon: '🌾', qualityLabel: 'ความชื้น', qualityUnit: '%', defaultQuality: 22, defaultWeight: 12500 },
  cassava: { name: 'มันสำปะหลังสด', icon: '🥔', qualityLabel: 'เชื้อแป้ง', qualityUnit: '%', defaultQuality: 27, defaultWeight: 12500 },
  sugarcane: { name: 'อ้อยโรงงาน', icon: '🎋', qualityLabel: 'C.C.S.', qualityUnit: 'C.C.S.', defaultQuality: 11.5, defaultWeight: 12500 },
};

function normalizeCrop(crop) {
  return crop === 'cane' ? 'sugarcane' : crop || 'rice';
}

export async function renderFacilityDetail(params = {}) {
  const id = params.id || 'fac-201'; // Default ID if not passed
  const facilities = await fetchFacilities();
  const facility = facilities.find(f => f.id === id) || facilities[0];
  const cropId = normalizeCrop(params.crop || (facility.type === 'cassava_yard' ? 'cassava' : facility.type === 'sugar_factory' ? 'sugarcane' : 'rice'));
  const meta = cropMeta[cropId];
  const weight = Number(params.weight || meta.defaultWeight);
  const quality = Number(params.moisture || meta.defaultQuality);
  const market = await fetchTodayPrice(cropId);
  const facilityPrice = await fetchFacilityPrice(facility.id, cropId);
  const rule = await fetchPricingRule(cropId);
  const basePrice = facilityPrice ?? market?.basePrice;

  if (!Number.isFinite(Number(basePrice)) || Number(basePrice) <= 0) {
    throw new Error(`Price unavailable for facility ${facility.id} and crop ${cropId}`);
  }
  const result = calculatePrice(cropId, cropId === 'sugarcane' ? weight / 1000 : weight, quality, basePrice, rule);
  const displayPrice = cropId === 'sugarcane' ? result.pricePerUnit : result.pricePerUnit * 1000;

  detailContext = { facility, cropId, meta, weight, quality, result, displayPrice };

  return `
    <div class="flex flex-col w-full space-y-space-lg pt-20 pb-24 max-w-xl mx-auto px-margin">
      
      <!-- Banner: Location & Trust Anchor -->
      <div class="bg-surface-container-high rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm">
        <div class="flex items-center gap-space-sm min-w-0">
          <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-headline-sm text-headline-sm text-on-surface truncate">บันทึกการขายจริง</span>
              <span class="bg-primary-fixed text-on-primary-fixed font-caption text-caption px-1.5 py-0.5 rounded-full font-bold">GPS Verified</span>
            </div>
            <p class="font-caption text-caption text-on-surface-variant truncate">ตรวจสอบความโปร่งใสและร่วมสร้างฐานข้อมูลชุมชน</p>
          </div>
        </div>
        <button type="button" class="px-space-sm py-1 bg-surface-container-lowest text-primary rounded-lg font-caption text-caption font-bold shadow-sm flex items-center gap-1 hover:bg-surface-bright active:scale-95 transition-transform flex-shrink-0">
          <span class="material-symbols-outlined text-[16px]">sync</span>
          <span>ซิงค์ 4G</span>
        </button>
      </div>

      <!-- Primary Verified Sale Entry Card -->
      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-lg space-y-space-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-xs">
            <span class="material-symbols-outlined text-primary text-[22px]">factory</span>
            <h2 class="font-headline-sm text-headline-sm text-on-surface">ลานรับซื้อที่ทำรายการ</h2>
          </div>
          <span class="bg-tertiary-fixed text-on-tertiary-fixed font-label-badge text-label-badge px-2 py-0.5 rounded-full">พิกัดแม่นยำ 98%</span>
        </div>

        <!-- Mill Selection with GPS Badge -->
        <div class="bg-surface-container-low rounded-xl p-space-md flex items-center justify-between gap-space-sm">
          <div class="flex items-center gap-space-sm min-w-0">
            <div class="w-11 h-11 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[26px]">domain</span>
            </div>
            <div class="min-w-0">
              <div class="font-body-lg text-body-lg font-bold text-on-surface truncate">${facility.name}</div>
              <div class="font-caption text-caption text-on-surface-variant flex items-center gap-1 truncate">
                <span class="material-symbols-outlined text-[14px] text-tertiary">near_me</span>
                <span>${facility.province} (รัศมีอ้างอิง 15 ม.)</span>
              </div>
            </div>
          </div>
          <button type="button" class="w-9 h-9 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center hover:bg-surface-variant active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-[20px]">edit_location</span>
          </button>
        </div>

        <!-- Crop & Scale Metrics Inputs Grid -->
        <div class="grid grid-cols-1 gap-space-md">
          <!-- Crop Type -->
          <div>
            <label class="block font-body-sm text-body-sm font-semibold text-on-surface-variant mb-1">ชนิดผลผลิตเกษตร</label>
            <div class="w-full bg-surface-container-low rounded-lg p-space-md flex items-center justify-between text-on-surface">
              <div class="flex items-center gap-2 font-body-lg text-body-lg font-semibold">
                <span class="material-symbols-outlined text-primary text-[20px]">psychiatry</span>
                <span>${meta.name}</span>
              </div>
              <span class="material-symbols-outlined text-outline">unfold_more</span>
            </div>
          </div>
          
          <!-- Numeric Row: Weight & Moisture -->
          <div class="grid grid-cols-2 gap-space-sm">
            <!-- Scale Weight -->
            <div class="bg-surface-container-low rounded-xl p-space-md">
              <span class="font-caption text-caption text-on-surface-variant block mb-1">น้ำหนักจริงหน้าตราชั่ง</span>
              <div class="flex items-baseline gap-1">
                <span class="font-display-lg-mobile text-display-lg-mobile text-on-surface font-bold">${weight.toLocaleString('th-TH')}</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">กก.</span>
              </div>
              <div class="flex items-center gap-1 mt-1 font-caption text-caption text-primary font-medium">
                <span class="material-symbols-outlined text-[14px]">scale</span>
                <span>หักรถ 3,200 กก. แล้ว</span>
              </div>
            </div>
            
            <!-- Moisture Comparison -->
            <div class="bg-surface-container-low rounded-xl p-space-md">
              <span class="font-caption text-caption text-on-surface-variant block mb-1">${meta.qualityLabel}หน้าลาน</span>
              <div class="flex items-baseline gap-1">
                <span class="font-display-lg-mobile text-display-lg-mobile text-tertiary font-bold">${quality.toLocaleString('th-TH')}</span>
                <span class="font-body-sm text-body-sm text-on-surface-variant">${meta.qualityUnit}</span>
              </div>
              <div class="flex items-center gap-1 mt-1 font-caption text-caption text-on-surface-variant">
                <span>อิงค่าจากเครื่องคำนวณ/หน้าลาน</span>
              </div>
            </div>
          </div>

          <!-- Price & Final Payout Highlight -->
          <div class="bg-surface-container-low rounded-xl p-space-md space-y-space-sm">
            <div class="flex justify-between items-center text-on-surface-variant font-body-sm text-body-sm">
              <span>ราคาประเมินหน้าลาน:</span>
              <span class="font-label-numeric text-label-numeric text-on-surface">${displayPrice.toLocaleString('th-TH', { maximumFractionDigits: 2 })} <span class="font-body-sm text-body-sm">บาท/ตัน</span></span>
            </div>
            
            <div class="bg-primary-fixed/30 rounded-xl p-space-md flex items-center justify-between">
              <div>
                <span class="font-caption text-caption text-primary font-bold block uppercase tracking-wide">ยอดรับเงินสุทธิ (Net Cash)</span>
                <div class="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">฿${Math.round(result.netPrice).toLocaleString('th-TH')}</div>
              </div>
              <div class="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
                <span class="material-symbols-outlined text-[28px]">payments</span>
              </div>
            </div>
          </div>
          
          <!-- Receipt Photo Preview Upload Box -->
          <div>
            <label class="block font-body-sm text-body-sm font-semibold text-on-surface-variant mb-1.5 flex items-center justify-between">
              <span>รูปถ่ายใบเสร็จ / บิลตราชั่ง (Digital Slip)</span>
              <span class="font-caption text-caption text-primary font-bold">ยืนยันแล้ว 1 ใบ</span>
            </label>
            <div class="relative rounded-xl overflow-hidden shadow-sm h-36 bg-surface-container-highest">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDODhta774L4YVRSY_SHXtwW_VBBu5bAi9ZVEQN3odwpyNy3FuAYZvPQw9VTztPz5NooT4DXHUlGHAAUquaojs9FQICwKsCWj27qt8CJc-B5zoOajY5ozj1ai2C8vPSbqrPfDy5ykd1uJvWlgIrIKKKjfkRGDf3vLlNGrIwkdodXAXPMheYXW6bm1F8acSzb2hwxHmcQRKmEYNlLznzmIDtKDweb2qMNfLImbtP8Sl9MXD3t4ThQM5I8g" class="w-full h-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 flex flex-col justify-between p-space-md text-white">
                <div class="flex justify-between items-center">
                  <span class="bg-primary text-on-primary font-caption text-caption px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">check_circle</span>
                    AI สแกนสำเร็จ
                  </span>
                  <button type="button" class="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform">
                    <span class="material-symbols-outlined text-[18px]">crop_free</span>
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-body-sm text-body-sm font-bold truncate">เลขที่บิล: RC-6709-0842</p>
                    <p class="font-caption text-caption text-slate-200">บันทึกเมื่อ 10:42 น. วันนี้</p>
                  </div>
                  <button type="button" class="px-2.5 py-1 bg-white/90 text-on-surface rounded-lg font-caption text-caption font-bold active:scale-95 transition-transform">
                    ถ่ายใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Fairness & Deduction Analysis Card -->
      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-lg space-y-space-md">
        <div class="flex items-center gap-space-xs">
          <span class="material-symbols-outlined text-secondary text-[24px]">gavel</span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface">การวิเคราะห์ความโปร่งใส (Fairness AI)</h2>
        </div>
        
        <!-- Diagnostic Breakdown -->
        <div class="space-y-space-sm">
          <div class="p-space-md bg-surface-container-low rounded-xl space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-body-sm text-body-sm text-on-surface-variant">ราคาติดประกาศหน้าลาน (DIT ป้ายใหญ่)</span>
              <span class="font-body-sm text-body-sm font-bold text-on-surface">${displayPrice.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท/ตัน</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="font-body-sm text-body-sm text-on-surface-variant">ราคาที่ได้รับจริง</span>
              <span class="font-body-sm text-body-sm font-bold text-on-surface">${displayPrice.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท/ตัน</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-dashed border-outline-variant">
              <div class="flex items-center gap-1 font-body-sm text-body-sm text-secondary font-semibold">
                <span class="material-symbols-outlined text-[16px]">info</span>
                <span>ส่วนต่างหักฝุ่น/สิ่งเจือปน</span>
              </div>
              <span class="font-label-badge text-label-badge text-secondary font-bold">ไม่มีส่วนต่างผิดปกติ</span>
            </div>
          </div>
          
          <!-- Trust Evaluation Result Badge -->
          <div class="p-space-md bg-primary-fixed/40 rounded-xl flex items-start gap-space-sm">
            <div class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
              <span class="material-symbols-outlined text-[20px]">thumb_up</span>
            </div>
            <div class="min-w-0">
              <div class="font-body-md text-body-md font-bold text-on-primary-fixed">ผ่านเกณฑ์มาตรฐานกรมการค้าภายใน</div>
              <p class="font-body-sm text-body-sm text-on-primary-fixed-variant mt-0.5 leading-snug">
                ระบบคำนวณด้วยสูตรกลางตามชนิดพืชและค่าคุณภาพที่ส่งมา ไม่พบการกดราคาผิดปกติหรือการหักซ้ำซ้อนจากข้อมูลชุดนี้
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Crowdsourced Community Review & Star Rating -->
      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-lg space-y-space-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-xs">
            <span class="material-symbols-outlined text-primary text-[22px]">rate_review</span>
            <h2 class="font-headline-sm text-headline-sm text-on-surface">ให้คะแนนลาน (Verified Review)</h2>
          </div>
          <span class="font-caption text-caption text-on-surface-variant font-medium">คะแนนของคุณช่วยเพื่อนชาวนา</span>
        </div>
        
        <div class="space-y-space-sm">
          <!-- 3-Pillar Interactive Ratings -->
          <div class="space-y-2">
            <div class="flex items-center justify-between py-1">
              <span class="font-body-sm text-body-sm text-on-surface font-medium">ความโปร่งใสเรื่องราคา</span>
              <div class="flex gap-1 text-secondary" id="rating-stars-1">
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 0;">star</span>
              </div>
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="font-body-sm text-body-sm text-on-surface font-medium">ความเที่ยงตรงของตาชั่ง</span>
              <div class="flex gap-1 text-secondary" id="rating-stars-2">
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
              </div>
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="font-body-sm text-body-sm text-on-surface font-medium">ความรวดเร็วในการลงผลผลิต</span>
              <div class="flex gap-1 text-secondary" id="rating-stars-3">
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 1;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 0;">star</span>
                <span class="material-symbols-outlined text-[22px] cursor-pointer" style="font-variation-settings: 'FILL' 0;">star</span>
              </div>
            </div>
          </div>
          
          <!-- Smart Tags Selection -->
          <div class="pt-2 border-t border-surface-container-high">
            <span class="font-caption text-caption text-on-surface-variant block mb-2">แตะข้อความเพื่อรีวิวอย่างรวดเร็ว:</span>
            <div class="flex flex-wrap gap-2">
              <span class="px-3 py-1.5 bg-surface-container text-on-surface-variant font-body-sm text-body-sm rounded-full active:bg-surface-container-high cursor-pointer">ตาชั่งมีจอตัวเลขเห็นชัดเจน</span>
              <span class="px-3 py-1.5 bg-primary text-on-primary font-body-sm text-body-sm rounded-full cursor-pointer">เครื่องวัดความชื้นได้มาตรฐาน</span>
              <span class="px-3 py-1.5 bg-surface-container text-on-surface-variant font-body-sm text-body-sm rounded-full active:bg-surface-container-high cursor-pointer">คิวไว พนักงานบริการดี</span>
              <span class="px-3 py-1.5 bg-surface-container text-on-surface-variant font-body-sm text-body-sm rounded-full active:bg-surface-container-high cursor-pointer">หักสิ่งเจือปนตามจริง</span>
            </div>
          </div>
          
          <!-- Free Text Voice Input Field -->
          <div class="relative mt-3">
            <textarea class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm p-3 pr-10 rounded-xl outline-none focus:bg-surface-container resize-none h-20" placeholder="พิมพ์หรือใช้เสียงเพิ่มความคิดเห็นเพิ่มเติม... (ไม่บังคับ)">ตาชั่งได้มาตรฐาน มีจอแสดงน้ำหนักชัดเจน พนักงานบริการดี มีน้ำดื่มบริการ</textarea>
            <button type="button" class="absolute bottom-3 right-3 text-primary p-1 active:scale-95 transition-transform">
              <span class="material-symbols-outlined">mic</span>
            </button>
          </div>
          
          <button id="btn-save-verified-transaction" type="button" class="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-body-md text-body-md font-bold flex items-center justify-center gap-2 shadow-sm transition-colors mt-2">
            <span class="material-symbols-outlined text-[20px]">cloud_upload</span>
            <span>บันทึกธุรกรรมและส่งข้อมูลชุมชน</span>
          </button>
        </div>
      </section>
      
    </div>
  `;
}

export function initFacilityDetailEvents() {
  const stars = document.querySelectorAll('[id^="rating-stars-"] span');
  stars.forEach(star => {
    star.addEventListener('click', (e) => {
      const parent = e.target.parentElement;
      const allStars = parent.querySelectorAll('span');
      const clickedIdx = Array.from(allStars).indexOf(e.target);

      allStars.forEach((s, idx) => {
        if (idx <= clickedIdx) s.style.fontVariationSettings = "'FILL' 1";
        else s.style.fontVariationSettings = "'FILL' 0";
      });
    });
  });

  const saveBtn = document.getElementById('btn-save-verified-transaction');
  if (saveBtn && detailContext) {
    saveBtn.addEventListener('click', async () => {
      const user = getUser();
      const reviewText = document.querySelector('textarea')?.value || '';
      const originalHtml = saveBtn.innerHTML;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">sync</span><span>กำลังบันทึก...</span>';

      const transaction = await saveTransaction({
        cropId: detailContext.cropId,
        cropName: detailContext.meta.name,
        cropIcon: detailContext.meta.icon,
        facilityId: detailContext.facility.id,
        facilityName: detailContext.facility.name,
        totalWeight: detailContext.weight,
        qualityMetric: detailContext.quality,
        qualityLabel: detailContext.meta.qualityLabel,
        predictedPrice: detailContext.result.netPrice,
        actualReceived: detailContext.result.netPrice,
        priceDifference: 0,
        pricePerUnit: detailContext.result.pricePerUnit,
        status: 'completed',
        notes: 'บันทึกธุรกรรม',
      });

      await saveReview({
        userName: user?.lineDisplayName || 'ไม่ระบุชื่อ',
        facilityId: detailContext.facility.id,
        facilityName: detailContext.facility.name,
        transactionId: transaction.id,
        rating: 5,
        reviewText,
        verified: true,
      });

      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">check_circle</span><span>บันทึกสำเร็จ เปิดดูในประวัติได้แล้ว</span>';
      setTimeout(() => {
        saveBtn.innerHTML = originalHtml;
      }, 2400);
    });
  }
}
