import { getDrafts, saveDraft } from '../utils/offline.js';
import { fetchPricingRule, fetchTodayPrice } from '../services/api.js';
import { calculatePrice } from '../engine/pricing-engine.js';
import { estimateTransportCost } from '../engine/transport-cost.js';
import { navigate } from '../router.js';
import { showToast } from '../utils/toast.js';

let currentCrop = 'rice';
let activeRadius = 30;

export async function renderCalculator(params = {}) {
  if (params.crop) currentCrop = params.crop === 'cane' ? 'sugarcane' : params.crop;

  return `
    <div class="flex flex-col w-full space-y-space-md pt-20 pb-24 max-w-xl mx-auto">
      
      <!-- Status / Offline Ready Banner -->
      <div class="bg-surface-container-high text-on-surface rounded-xl p-space-md shadow-sm flex items-center justify-between">
        <div class="flex items-center gap-space-sm min-w-0">
          <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[18px]">cloud_done</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-body-sm text-body-sm font-bold text-on-surface truncate">บันทึกออฟไลน์พร้อมใช้งาน</span>
            <span class="font-caption text-caption text-on-surface-variant truncate">ราคากลาง DIT ล่าสุด: วันนี้ 08:30 น. (แม่นยำสูง)</span>
          </div>
        </div>
        <span class="font-label-badge text-label-badge bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full flex-shrink-0">ONLINE 4G</span>
      </div>

      <!-- Crop Category Horizontal Selector -->
      <div class="flex flex-col space-y-space-xs">
        <label class="font-body-sm text-body-sm font-bold text-on-surface flex items-center justify-between">
          <span>เลือกชนิดพืชผลเกษตร</span>
          <span class="font-caption text-caption text-primary flex items-center gap-1 font-semibold">
            <span class="material-symbols-outlined text-[14px]">info</span>สูตรหักชื้น กรมการค้าภายใน
          </span>
        </label>
        <div class="grid grid-cols-3 gap-space-xs bg-surface-container-low p-1.5 rounded-xl">
          <button type="button" id="btn-crop-rice" class="crop-btn py-2.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all duration-150 bg-primary text-on-primary shadow-sm">
            <span class="material-symbols-outlined text-[22px] mb-0.5" style="font-variation-settings: 'FILL' 1;">eco</span>
            <span class="font-body-sm text-body-sm font-bold leading-none text-center">ข้าวเปลือก</span>
            <span class="font-caption text-[10px] opacity-90 mt-0.5">หอมมะลิ (15%)</span>
          </button>
          
          <button type="button" id="btn-crop-cassava" class="crop-btn py-2.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all duration-150 bg-surface-container-lowest text-on-surface hover:bg-surface-container">
            <span class="material-symbols-outlined text-[22px] mb-0.5 text-secondary">nutrition</span>
            <span class="font-body-sm text-body-sm font-bold leading-none text-center">มันสำปะหลัง</span>
            <span class="font-caption text-[10px] text-on-surface-variant mt-0.5">เชื้อแป้ง 25%</span>
          </button>
          
          <button type="button" id="btn-crop-cane" class="crop-btn py-2.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all duration-150 bg-surface-container-lowest text-on-surface hover:bg-surface-container">
            <span class="material-symbols-outlined text-[22px] mb-0.5 text-tertiary">grass</span>
            <span class="font-body-sm text-body-sm font-bold leading-none text-center">อ้อยโรงงาน</span>
            <span class="font-caption text-[10px] text-on-surface-variant mt-0.5">ค่าความหวาน C.C.S.</span>
          </button>
        </div>
      </div>

      <!-- Visual Hero Photo Card for Crop Confidence -->
      <div class="relative w-full rounded-2xl overflow-hidden bg-surface-container shadow-sm h-36">
        <img id="crop-hero-image" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDF33Ll-e5-8cby5xDLkjPDAeeTCsoAamkPsoEteOyNnxYqpDSdFUrct-6nU4gcHOm-GFrfPE4IEu0sn1F0PEoNnETGqPRNt0MSdetuiyWuReHf44y_5ShSGghLO7dGkY9M23vIYSlJcptS_5SiUswKG2FLnWKRZHKsVQ6DjvPCoznigk1pCWfJ80sQQEh6HuixEaXCWznYFqMkwvTn6XMYu9a9HtW-juQx40Jbep2U2_o8pk2Bh2P-cA" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex items-end p-space-md">
          <div class="flex items-center justify-between w-full text-surface">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px] text-primary-fixed">verified</span>
                <span id="crop-hero-title" class="font-headline-sm text-headline-sm text-surface font-bold">ข้าวหอมมะลิสด ฤดูกาล 67/68</span>
              </div>
              <p id="crop-hero-sub" class="font-caption text-caption text-surface-container-high">เกณฑ์หักความชื้นมาตรฐาน: ความชื้นเกิน 15% หัก 1.5% ต่อหน่วย</p>
            </div>
            <div class="bg-surface-container-lowest/20 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-right">
              <span class="font-caption text-[10px] text-surface-container-high block">ราคากลางอ้างอิง DIT</span>
              <span id="crop-ref-price-badge" class="font-label-badge text-label-badge text-primary-fixed">฿14,800/ตัน</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Primary Inputs Matrix (Built for Outdoor Glare / Thick Touch Fingers) -->
      <div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm space-y-space-md">
        
        <!-- Input 1: Total Harvest Weight -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="input-weight" class="font-body-sm text-body-sm font-bold text-on-surface flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-primary">scale</span>
              <span>น้ำหนักชั่งรวม (Gross Weight)</span>
            </label>
            <span class="font-caption text-caption text-on-surface-variant font-medium">รวมรถชั่งหักตัวถังแล้ว</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input type="number" id="input-weight" step="50" value="12500" class="w-full h-14 bg-surface-container-low text-on-surface font-display-lg-mobile text-display-lg-mobile px-space-md rounded-xl outline-none focus:bg-surface-container font-bold transition-all text-left" />
              <span class="absolute right-4 top-1/2 -translate-y-1/2 font-body-sm text-body-sm font-bold text-on-surface-variant">กก.</span>
            </div>
            <div class="flex flex-col gap-1 w-24">
              <button type="button" id="btn-add-weight" class="h-[26px] bg-surface-container text-on-surface rounded-lg font-bold text-[13px] flex items-center justify-center active:bg-surface-container-high">+500</button>
              <button type="button" id="btn-sub-weight" class="h-[26px] bg-surface-container text-on-surface rounded-lg font-bold text-[13px] flex items-center justify-center active:bg-surface-container-high">-500</button>
            </div>
          </div>
          <div class="flex items-center justify-between px-1">
            <span id="label-ton-equivalent" class="font-caption text-caption text-primary font-semibold">เท่ากับ 12.50 ตัน</span>
            <span class="font-caption text-caption text-on-surface-variant">มาตรฐานชั่งผ่านดิจิทัล</span>
          </div>
        </div>

        <!-- Input 2: Moisture / Quality Percentage -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label id="label-quality-param" for="input-moisture" class="font-body-sm text-body-sm font-bold text-on-surface flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-secondary">water_drop</span>
              <span>ความชื้นที่วัดได้จริง (%)</span>
            </label>
            <span id="badge-quality-delta" class="font-label-badge text-label-badge bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full font-bold">เกินเกณฑ์ +7.0%</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input type="number" id="input-moisture" step="0.5" value="22.0" class="w-full h-14 bg-surface-container-low text-on-surface font-display-lg-mobile text-display-lg-mobile px-space-md rounded-xl outline-none focus:bg-surface-container font-bold transition-all text-left" />
              <span id="input-unit-symbol" class="absolute right-4 top-1/2 -translate-y-1/2 font-body-sm text-body-sm font-bold text-on-surface-variant">%</span>
            </div>
            <!-- Stepper tactile controls -->
            <div class="flex items-center gap-1">
              <button type="button" id="btn-sub-moisture" class="w-12 h-14 bg-surface-container text-on-surface rounded-xl font-headline-md text-headline-md flex items-center justify-center active:bg-surface-container-highest shadow-sm select-none">-</button>
              <button type="button" id="btn-add-moisture" class="w-12 h-14 bg-surface-container text-on-surface rounded-xl font-headline-md text-headline-md flex items-center justify-center active:bg-surface-container-highest shadow-sm select-none">+</button>
            </div>
          </div>
          <!-- Moisture Slider Helper for Fast Thumb Drag -->
          <div class="pt-1">
            <input type="range" id="slider-moisture" min="12.0" max="30.0" step="0.5" value="22.0" class="w-full accent-primary h-2 bg-surface-container rounded-lg appearance-none cursor-pointer" />
            <div class="flex justify-between font-caption text-[11px] text-on-surface-variant mt-1">
              <span>12.0% (แห้งมาก)</span>
              <span class="font-bold text-primary">15.0% (เกณฑ์มาตรฐาน)</span>
              <span>25.0%+ (ชื้นสูง)</span>
            </div>
          </div>
        </div>

        <!-- Input 3: Base Market Reference Price -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="input-base-price" class="font-body-sm text-body-sm font-bold text-on-surface flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-tertiary">monetization_on</span>
              <span>ราคารับซื้ออ้างอิง (บาท/ตัน)</span>
            </label>
            <span id="btn-reset-price" class="font-caption text-caption text-tertiary font-bold cursor-pointer">รีเซ็ตราคากลาง DIT</span>
          </div>
          <div class="relative">
            <input type="number" id="input-base-price" step="100" value="14800" class="w-full h-14 bg-surface-container-low text-on-surface font-headline-lg text-headline-lg px-space-md rounded-xl outline-none focus:bg-surface-container font-bold transition-all text-left" />
            <div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span class="font-body-sm text-body-sm font-bold text-on-surface-variant">บาท/ตัน</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Real-Time Financial Summary Calculation Hero Box -->
      <div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-md space-y-space-md overflow-hidden relative">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">calculate</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">ผลการประเมินราคาตามเกณฑ์หัก</h3>
          </div>
          <span class="font-label-badge text-label-badge bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">คำนวณสด</span>
        </div>
        
        <!-- The Big Green Net Payout Display Card -->
        <div class="bg-primary-fixed/25 rounded-xl p-space-md space-y-1 text-center shadow-sm">
          <span class="font-caption text-caption font-semibold text-on-surface-variant uppercase tracking-wider">มูลค่าสุทธิประเมินที่จะได้รับ (Net Payout)</span>
          <div id="res-total-payout" class="font-display-lg-mobile text-display-lg-mobile font-bold text-primary tracking-tight leading-none py-1">
            ฿165,575
          </div>
          <div class="flex items-center justify-center gap-2 pt-1">
            <span id="res-average-price" class="font-body-sm text-body-sm font-bold text-on-surface">เฉลี่ย 13.25 บาท/กก. สด</span>
            <span id="res-loss-rate" class="font-caption text-caption bg-surface-container-lowest/80 text-on-surface-variant px-2 py-0.5 rounded-full font-medium">หักชื้น 10.50%</span>
          </div>
        </div>

        <!-- Line Item Breakdown Table -->
        <div class="space-y-2.5 font-body-sm text-body-sm text-on-surface pt-1">
          <div class="flex items-center justify-between pb-2 bg-surface-container-low/50 p-2 rounded-lg">
            <span class="text-on-surface-variant flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-on-surface-variant">hourglass_bottom</span>
              <span id="res-param-excess-label">ความชื้นส่วนเกินเกณฑ์ (มาตรฐาน 15%)</span>
            </span>
            <span id="res-excess-val" class="font-bold text-secondary">+7.0%</span>
          </div>
          <div class="flex items-center justify-between pb-2 bg-surface-container-low/50 p-2 rounded-lg">
            <span class="text-on-surface-variant flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-error">trending_down</span>
              <span>น้ำหนักที่ถูกหักลดตามสูตร</span>
            </span>
            <div class="text-right">
              <span id="res-weight-deducted" class="font-bold text-error block">-1,312.50 กก.</span>
              <span id="res-deduct-percentage" class="font-caption text-[11px] text-on-surface-variant">(สูตรหัก 10.50%)</span>
            </div>
          </div>
          <div class="flex items-center justify-between pb-2 bg-surface-container-low/50 p-2 rounded-lg">
            <span class="text-on-surface-variant flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-primary">inventory_2</span>
              <span>น้ำหนักสุทธิส่งมอบประเมินได้</span>
            </span>
            <div class="text-right">
              <span id="res-net-weight" class="font-bold text-on-surface block">11,187.50 กก.</span>
              <span id="res-net-tons" class="font-caption text-[11px] text-primary font-semibold">(11.19 ตัน)</span>
            </div>
          </div>
          <div class="flex items-center justify-between pb-2 bg-surface-container-low/50 p-2 rounded-lg">
            <span class="text-on-surface-variant flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-tertiary">local_shipping</span>
              <span>คาดการณ์ค่าขนส่งเฉลี่ย (รัศมี 30 กม.)</span>
            </span>
            <span id="res-est-transport" class="font-bold text-on-surface">-฿3,750 บาท</span>
          </div>
        </div>

        <!-- Crop Specific Quality Formula Explanation Card -->
        <div id="crop-formula-card" class="bg-surface-container p-space-md rounded-xl space-y-1">
          <div class="flex items-center gap-1.5 font-body-sm text-body-sm font-bold text-on-surface">
            <span class="material-symbols-outlined text-[16px] text-primary">menu_book</span>
            <span id="formula-title">เกณฑ์สูตรคำนวณข้าวหอมมะลิ (DIT):</span>
          </div>
          <p id="formula-desc" class="font-caption text-caption text-on-surface-variant leading-relaxed">
            ความชื้น 15.0% - 25.0% หักน้ำหนัก 1.5% ต่อน้ำหนักข้าวเปลือกทุกๆ 1% ความชื้นที่เกิน หากความชื้นเกิน 25.0% ให้หักเพิ่มเป็น 2.0% ต่อ 1% ความชื้นส่วนเกิน
          </p>
        </div>
      </div>

      <!-- GIS Mill Matcher Quick Launch Widget -->
      <div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm space-y-space-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">near_me</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm font-bold text-on-surface">ค้นหาลานรับซื้อรอบตัว</h3>
          </div>
          <!-- Distance Radius Selector -->
          <div class="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
            <button type="button" class="radius-btn px-2 py-0.5 text-caption font-bold rounded text-on-surface-variant hover:text-on-surface" data-radius="15">15 กม.</button>
            <button type="button" class="radius-btn active-radius px-2 py-0.5 text-caption font-bold rounded bg-tertiary text-on-tertiary shadow-sm" data-radius="30">30 กม.</button>
            <button type="button" class="radius-btn px-2 py-0.5 text-caption font-bold rounded text-on-surface-variant hover:text-on-surface" data-radius="50">50 กม.</button>
          </div>
        </div>

        <!-- Mini GIS Map Preview Container -->
        <div class="w-full h-32 bg-cover bg-center rounded-xl relative overflow-hidden shadow-inner flex items-end p-2.5" data-location="Roi Et, Thailand" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCxsLAczX-0RvXJmODB-gkICe2nzw-jl2kQ8D0uWrqb37edwdYvaLfGGlW4cfTV24lSHKoZJuaj7-8AChmteLBSLut1hqzGu2_F0x35jYG6jqajGRNCKBjdnoyAbSetb37tSkzV2I4OMHBtdZ32Cw7WcWFApwu9DmsSobqegAEUwECVg5qdOfvAnW2sr-zSWCpOnZUt23r-CZy1SO-jZXOQ4s5-QOioBJJgfHAWHhERagDI7dDsTU5BSQ');">
          <div class="bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center justify-between w-full shadow-sm">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span class="font-caption text-caption font-bold text-on-surface">พบ 4 ลานรับซื้อที่เปิดรับขณะนี้</span>
            </div>
            <span class="font-caption text-[10px] text-tertiary font-bold">ระยะใกล้สุด 8.4 กม.</span>
          </div>
        </div>

        <!-- Top Recommended Mill Tile -->
        <div class="bg-surface-container-low rounded-xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center flex-shrink-0 font-bold font-display-lg-mobile text-[18px]">
              1
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1">
                <span class="font-body-sm text-body-sm font-bold text-on-surface truncate">สหกรณ์การเกษตรเกษตรวิสัย</span>
                <span class="material-symbols-outlined text-[14px] text-primary">verified</span>
              </div>
              <span class="font-caption text-caption text-on-surface-variant truncate block">รับซื้อ 14,950 ฿/ตัน • คิวรอประมาณ 3 คัน (25 นาที)</span>
            </div>
          </div>
          <a href="tel:0891234567" class="h-9 px-3 bg-surface-container text-on-surface rounded-lg font-body-sm text-[13px] font-bold flex items-center gap-1 flex-shrink-0 active:bg-surface-container-high">
            <span>โทร</span>
            <span class="material-symbols-outlined text-[16px]">call</span>
          </a>
        </div>

        <!-- GIS Action Callout Button -->
        <button id="btn-goto-map" type="button" class="w-full h-12 bg-tertiary hover:bg-tertiary/90 active:bg-tertiary text-on-tertiary rounded-xl font-body-md text-body-md font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
          <span class="material-symbols-outlined text-[20px]">explore</span>
          <span>ดูพิกัดเปรียบเทียบกำไรสุทธิทุกแห่ง (GIS)</span>
        </button>
      </div>

      <!-- Secondary Actions & Draft Record Bar -->
      <div class="pt-space-xs pb-space-lg space-y-space-sm">
        <button type="button" id="btn-save-draft" class="w-full h-14 bg-primary text-on-primary rounded-2xl font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-md active:bg-primary-container transition-all">
          <span class="material-symbols-outlined text-[22px]">save</span>
          <span>บันทึกร่างผลผลิตล็อตนี้</span>
        </button>
        <div class="flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
          <span class="font-caption text-caption text-on-surface-variant">ข้อมูลบันทึกในเครื่องทันที และจะซิงก์สู่ระบบกลางเมื่อต่อเน็ต</span>
        </div>
      </div>
      
    </div>
  `;
}

export function initCalculatorEvents() {
  const cropConfigs = {
    rice: {
      title: 'ข้าวหอมมะลิสด ฤดูกาล 67/68',
      sub: 'เกณฑ์หักความชื้นมาตรฐาน: ความชื้นเกิน 15% หัก 1.5% ต่อหน่วย',
      refPrice: 14800,
      priceBadge: '฿14,800/ตัน',
      qualityParamName: 'ความชื้นที่วัดได้จริง (%)',
      qualityDefault: 22.0,
      standardQuality: 15.0,
      qualityUnit: '%',
      sliderMin: 12.0,
      sliderMax: 30.0,
      excessLabel: 'ความชื้นส่วนเกินเกณฑ์ (มาตรฐาน 15%)',
      formulaTitle: 'เกณฑ์สูตรคำนวณข้าวหอมมะลิ (DIT):',
      formulaDesc: 'ความชื้น 15.0% - 25.0% หักน้ำหนัก 1.5% ต่อน้ำหนักข้าวเปลือกทุกๆ 1% ความชื้นที่เกิน หากความชื้นเกิน 25.0% ให้หักเพิ่มเป็น 2.0% ต่อ 1% ความชื้นส่วนเกิน'
    },
    cassava: {
      title: 'มันสำปะหลังสด (เชื้อแป้ง)',
      sub: 'เกณฑ์ราคาอ้างอิงเชื้อแป้งมาตรฐาน 25% (±0.10 บาท ต่อ 1% เชื้อแป้ง)',
      refPrice: 3200,
      priceBadge: '฿3,200/ตัน',
      qualityParamName: 'เปอร์เซ็นต์เชื้อแป้งที่วัดได้ (%)',
      qualityDefault: 27.0,
      standardQuality: 25.0,
      qualityUnit: '%',
      sliderMin: 18.0,
      sliderMax: 32.0,
      excessLabel: 'ผลต่างเชื้อแป้งจากเกณฑ์ (มาตรฐาน 25%)',
      formulaTitle: 'สูตรหัก-เพิ่มเชื้อแป้งมันสำปะหลัง:',
      formulaDesc: 'ฐานแป้ง 25% เป็นเกณฑ์มาตรฐาน แป้งเพิ่มหรือลด 1% ปรับราคาบวก/ลบ 10 สตางค์ต่อกิโลกรัม (100 บาท/ตัน) ตามประกาศสมาคมแป้งมัน'
    },
    sugarcane: {
      title: 'อ้อยสดส่งโรงงานน้ำตาล',
      sub: 'เกณฑ์มาตรฐานความหวาน 10 C.C.S. (ปรับ ±53.40 บาท ต่อ 1 C.C.S.)',
      refPrice: 1420,
      priceBadge: '฿1,420/ตัน',
      qualityParamName: 'ค่าความหวานที่ตรวจได้ (C.C.S.)',
      qualityDefault: 11.5,
      standardQuality: 10.0,
      qualityUnit: 'C.C.S.',
      sliderMin: 7.0,
      sliderMax: 15.0,
      excessLabel: 'ความหวานต่างจากเกณฑ์ (ฐาน 10 C.C.S.)',
      formulaTitle: 'สูตรประเมินอ้อยโรงงาน (สอน. / กอน.):',
      formulaDesc: 'คำนวณค่าอ้อยขั้นต้น ความหวาน 10 C.C.S. เป็นเกณฑ์ หากความหวานสูงกว่าเกณฑ์ จะได้เงินเพิ่ม 53.40 บาท/ตัน ต่อ 1 หน่วย C.C.S.'
    }
  };

  const btnRice = document.getElementById('btn-crop-rice');
  const btnCassava = document.getElementById('btn-crop-cassava');
  const btnCane = document.getElementById('btn-crop-cane');
  const inWeight = document.getElementById('input-weight');
  const inMoisture = document.getElementById('input-moisture');
  const inBasePrice = document.getElementById('input-base-price');
  const sliderMoisture = document.getElementById('slider-moisture');
  const radiusBtns = document.querySelectorAll('.radius-btn');

  async function switchCrop(crop) {
    currentCrop = crop;
    const config = cropConfigs[crop];

    [btnRice, btnCassava, btnCane].forEach(btn => {
      btn.className = 'crop-btn py-2.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all duration-150 bg-surface-container-lowest text-on-surface hover:bg-surface-container';
    });
    const activeBtn = document.getElementById(crop === 'sugarcane' ? 'btn-crop-cane' : `btn-crop-${crop}`);
    activeBtn.className = 'crop-btn py-2.5 px-2 rounded-lg flex flex-col items-center justify-center transition-all duration-150 bg-primary text-on-primary shadow-sm';

    document.getElementById('crop-hero-title').innerText = config.title;
    document.getElementById('crop-hero-sub').innerText = config.sub;
    document.getElementById('crop-ref-price-badge').innerText = config.priceBadge;

    document.getElementById('label-quality-param').innerHTML = `<span class="material-symbols-outlined text-[18px] text-secondary">tune</span><span>${config.qualityParamName}</span>`;
    document.getElementById('input-unit-symbol').innerText = config.qualityUnit;
    
    sliderMoisture.min = config.sliderMin;
    sliderMoisture.max = config.sliderMax;
    sliderMoisture.value = config.qualityDefault;

    inMoisture.value = config.qualityDefault.toFixed(1);
    
    // UI Loading state for price fetch
    inBasePrice.value = '...';
    try {
      const marketPrice = await fetchTodayPrice(crop);
      inBasePrice.value = marketPrice ? Math.round(marketPrice.basePrice * (crop === 'sugarcane' ? 1 : 1000)) : config.refPrice;
      if (!marketPrice) showToast('ใช้ราคาอ้างอิงเริ่มต้น (ระบบทดลอง)', 'info');
    } catch (err) {
      inBasePrice.value = config.refPrice;
      showToast('ไม่สามารถดึงราคากลางได้ เปิดใช้งานโหมดออฟไลน์', 'error');
    }

    document.getElementById('formula-title').innerText = config.formulaTitle;
    document.getElementById('formula-desc').innerText = config.formulaDesc;
    document.getElementById('res-param-excess-label').innerText = config.excessLabel;

    await calculateRealtime();
  }

  function adjustWeight(delta) {
    let val = parseFloat(inWeight.value) || 0;
    val = Math.max(100, val + delta);
    inWeight.value = val;
    calculateRealtime();
  }

  function adjustMoisture(delta) {
    let val = parseFloat(inMoisture.value) || 0;
    val = Math.max(1, +(val + delta).toFixed(1));
    inMoisture.value = val.toFixed(1);
    sliderMoisture.value = val;
    calculateRealtime();
  }

  async function calculateRealtime() {
    const weight = parseFloat(inWeight.value) || 0;
    const qualityVal = parseFloat(inMoisture.value) || 0;
    const basePricePerTon = parseFloat(inBasePrice.value) || 0;

    const tons = (weight / 1000).toFixed(2);
    document.getElementById('label-ton-equivalent').innerText = `เท่ากับ ${tons} ตัน`;

    const config = cropConfigs[currentCrop];
    const rule = await fetchPricingRule(currentCrop);
    const basePriceForEngine = currentCrop === 'sugarcane' ? basePricePerTon : basePricePerTon / 1000;
    const weightForEngine = currentCrop === 'sugarcane' ? weight / 1000 : weight;
    const result = calculatePrice(currentCrop, weightForEngine, qualityVal, basePriceForEngine, rule);
    const diff = qualityVal - config.standardQuality;

    if (currentCrop === 'rice') {
      const deductPercent = weight > 0 ? (result.weightDeduction / weight) * 100 : 0;
      document.getElementById('res-excess-val').innerText = diff > 0 ? `+${diff.toFixed(1)}%` : `0.0%`;
      document.getElementById('res-weight-deducted').innerText = `-${result.weightDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} กก.`;
      document.getElementById('res-deduct-percentage').innerText = `(สูตรหัก ${deductPercent.toFixed(2)}%)`;
      document.getElementById('res-loss-rate').innerText = `หักชื้น ${deductPercent.toFixed(2)}%`;
    } 
    else if (currentCrop === 'cassava') {
      document.getElementById('res-excess-val').innerText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
      document.getElementById('res-weight-deducted').innerText = diff >= 0 ? `+฿${(diff * 100).toFixed(0)}/ตัน (พรีเมียม)` : `-฿${Math.abs(diff * 100).toFixed(0)}/ตัน (หักแป้ง)`;
      document.getElementById('res-deduct-percentage').innerText = `(ราคาปรับเป็น ฿${(result.adjustedPrice * 1000).toLocaleString('th-TH')}/ตัน)`;
      document.getElementById('res-loss-rate').innerText = diff >= 0 ? `โบนัสแป้ง +${(diff*0.1).toFixed(2)}฿/กก.` : `หักแป้ง ${(diff*0.1).toFixed(2)}฿/กก.`;
    } 
    else if (currentCrop === 'sugarcane') {
      document.getElementById('res-excess-val').innerText = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} CCS`;
      document.getElementById('res-weight-deducted').innerText = diff >= 0 ? `+฿${(diff * 53.4).toFixed(1)}/ตัน` : `-฿${Math.abs(diff * 53.4).toFixed(1)}/ตัน`;
      document.getElementById('res-deduct-percentage').innerText = `(ราคาตาม CCS ฿${result.pricePerUnit.toFixed(2)}/ตัน)`;
      document.getElementById('res-loss-rate').innerText = `${diff >= 0 ? '+' : ''}${(diff*53.4).toFixed(0)} บาท/ตัน`;
    }

    const deltaBadgeText = diff >= 0
      ? `${currentCrop === 'sugarcane' ? 'สูงกว่าเกณฑ์' : currentCrop === 'rice' ? 'เกินเกณฑ์' : 'สูงกว่าเกณฑ์'} +${diff.toFixed(1)}${currentCrop === 'sugarcane' ? ' CCS' : '%'}`
      : `ต่ำกว่าเกณฑ์ ${diff.toFixed(1)}${currentCrop === 'sugarcane' ? ' CCS' : '%'}`;
    const displayNetWeight = currentCrop === 'sugarcane' ? weight : result.netWeight;
    const avgPerKg = weight > 0 ? result.netPrice / weight : 0;
    const estTransportCost = Math.round(estimateTransportCost(activeRadius, weight / 1000));
    document.getElementById('res-est-transport').innerText = `-฿${estTransportCost.toLocaleString('th-TH')} บาท`;

    document.getElementById('badge-quality-delta').innerText = deltaBadgeText;
    document.getElementById('res-total-payout').innerText = `฿${Math.round(result.netPrice).toLocaleString('th-TH')}`;
    document.getElementById('res-average-price').innerText = `เฉลี่ย ${avgPerKg.toFixed(2)} บาท/กก. สด`;
    document.getElementById('res-net-weight').innerText = `${displayNetWeight.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})} กก.`;
    document.getElementById('res-net-tons').innerText = `(${(displayNetWeight / 1000).toFixed(2)} ตัน)`;
    return result;
  }

  // Bind Events
  btnRice.addEventListener('click', () => switchCrop('rice'));
  btnCassava.addEventListener('click', () => switchCrop('cassava'));
  btnCane.addEventListener('click', () => switchCrop('sugarcane'));

  document.getElementById('btn-add-weight').addEventListener('click', () => adjustWeight(500));
  document.getElementById('btn-sub-weight').addEventListener('click', () => adjustWeight(-500));
  inWeight.addEventListener('input', calculateRealtime);

  document.getElementById('btn-add-moisture').addEventListener('click', () => adjustMoisture(0.5));
  document.getElementById('btn-sub-moisture').addEventListener('click', () => adjustMoisture(-0.5));
  inMoisture.addEventListener('input', () => {
    sliderMoisture.value = inMoisture.value;
    calculateRealtime();
  });
  sliderMoisture.addEventListener('input', (e) => {
    inMoisture.value = parseFloat(e.target.value).toFixed(1);
    calculateRealtime();
  });

  document.getElementById('btn-reset-price').addEventListener('click', () => {
    inBasePrice.value = cropConfigs[currentCrop].refPrice;
    calculateRealtime();
  });
  inBasePrice.addEventListener('input', calculateRealtime);

  radiusBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeRadius = parseInt(e.target.dataset.radius);
      radiusBtns.forEach(b => b.className = 'radius-btn px-2 py-0.5 text-caption font-bold rounded text-on-surface-variant hover:text-on-surface');
      e.target.className = 'radius-btn active-radius px-2 py-0.5 text-caption font-bold rounded bg-tertiary text-on-tertiary shadow-sm';
      calculateRealtime();
    });
  });

  const btnSave = document.getElementById('btn-save-draft');
  btnSave.addEventListener('click', async () => {
    const originalHtml = btnSave.innerHTML;
    btnSave.innerHTML = `<span class="material-symbols-outlined text-[22px] animate-spin">sync</span><span>กำลังบันทึกลงหน่วยความจำ...</span>`;
    btnSave.classList.replace('bg-primary', 'bg-tertiary');
    
    setTimeout(() => {
      btnSave.innerHTML = `<span class="material-symbols-outlined text-[22px]">check_circle</span><span>บันทึกร่างผลผลิตสำเร็จ (#DFT-${Math.floor(1000 + Math.random() * 9000)})</span>`;
      btnSave.classList.replace('bg-tertiary', 'bg-primary-container');
      btnSave.classList.add('text-on-primary-container');
      
      calculateRealtime().then(result => {
        saveDraft({
          cropId: currentCrop,
          cropName: cropConfigs[currentCrop].title,
          cropIcon: currentCrop === 'rice' ? '🌾' : currentCrop === 'cassava' ? '🥔' : '🎋',
          totalWeight: Number(inWeight.value),
          qualityMetric: Number(inMoisture.value),
          qualityLabel: currentCrop === 'rice' ? 'ความชื้น' : currentCrop === 'cassava' ? 'เชื้อแป้ง' : 'C.C.S.',
          basePrice: Number(inBasePrice.value),
          predictedPrice: result.netPrice,
          pricePerUnit: result.pricePerUnit,
          radiusKm: activeRadius,
          status: 'draft',
        });
        showToast('บันทึกร่างสำเร็จ ข้อมูลถูกเก็บไว้ในเครื่อง', 'success');
      });
      
      setTimeout(() => {
        btnSave.innerHTML = originalHtml;
        btnSave.classList.replace('bg-primary-container', 'bg-primary');
        btnSave.classList.remove('text-on-primary-container');
      }, 2500);
    }, 600);
  });

  document.getElementById('btn-goto-map').addEventListener('click', () => {
    navigate(`/map?crop=${currentCrop}&weight=${inWeight.value}&moisture=${inMoisture.value}&radius=${activeRadius}`);
  });

  // Init
  switchCrop(currentCrop);
}
