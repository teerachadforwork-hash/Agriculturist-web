export function renderLanding() {
  return `
    <div class="min-h-screen bg-surface overflow-x-hidden pt-10">
      <!-- Hero Section -->
      <section class="relative min-h-[90vh] flex items-center pt-20 pb-16">
        <!-- Background Effects -->
        <div class="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          <div class="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary-fixed/30 rounded-full blur-[80px] animate-pulse"></div>
          <div class="absolute bottom-[-50px] left-[-50px] w-[400px] h-[400px] bg-tertiary-fixed/30 rounded-full blur-[80px]"></div>
        </div>

        <div class="w-full max-w-xl mx-auto px-margin relative z-10 text-center space-y-space-lg fade-in">
          <div class="inline-flex items-center gap-2 px-5 py-2 bg-primary-fixed/20 border border-primary-fixed rounded-full text-primary-fixed-dim font-body-sm font-bold shadow-sm">
            <span>🌾</span> ระบบสนับสนุนการตัดสินใจสำหรับเกษตรกรไทย
          </div>

          <h1 class="font-display-lg-mobile text-display-lg-mobile font-bold text-on-surface leading-tight">
            ประเมินราคาผลผลิต<br/>
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-tertiary to-primary animate-pulse inline-block mt-2 text-[48px]">อัจฉริยะ</span>
          </h1>

          <p class="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto leading-relaxed">
            คำนวณราคาข้าว อ้อย มันสำปะหลังตามมาตรฐานกรมการค้าภายใน
            ค้นหาจุดรับซื้อที่ให้ผลตอบแทนสูงสุด พร้อมระบบเตือนภัยราคาล่วงหน้า
          </p>

          <div class="flex justify-center pt-4">
            <button type="button" onclick="window.location.hash='/login'" class="w-full max-w-xs h-14 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.98] transition-all text-white rounded-xl font-body-lg text-body-lg font-bold flex items-center justify-center gap-3 shadow-md">
              <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
                <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992z..."/>
              </svg>
              <span>เข้าสู่ระบบด้วย LINE</span>
            </button>
          </div>

          <div class="flex items-center justify-center gap-6 pt-8 flex-wrap">
            <div class="text-center">
              <span class="block font-headline-lg text-headline-lg font-bold text-on-surface">20+</span>
              <span class="font-caption text-caption text-on-surface-variant">จุดรับซื้อในระบบ</span>
            </div>
            <div class="w-px h-10 bg-surface-container-high hidden sm:block"></div>
            <div class="text-center">
              <span class="block font-headline-lg text-headline-lg font-bold text-on-surface">3</span>
              <span class="font-caption text-caption text-on-surface-variant">ชนิดพืชหลัก</span>
            </div>
            <div class="w-px h-10 bg-surface-container-high hidden sm:block"></div>
            <div class="text-center">
              <span class="block font-headline-lg text-headline-lg font-bold text-on-surface">3<small class="text-body-md">ด.</small></span>
              <span class="font-caption text-caption text-on-surface-variant">พยากรณ์ล่วงหน้า</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="py-20 px-margin bg-surface-container-lowest">
        <div class="max-w-xl mx-auto">
          <div class="text-center mb-12">
            <h2 class="font-headline-md text-headline-md font-bold text-on-surface mb-2">ระบบครบวงจร 4 ระยะ</h2>
            <p class="font-body-sm text-body-sm text-on-surface-variant">ตามวัฏจักรการเก็บเกี่ยวและการขายผลผลิต</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <div class="bg-surface p-space-lg rounded-2xl border border-surface-container-highest shadow-sm">
              <div class="w-12 h-12 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[24px]">satellite_alt</span>
              </div>
              <h3 class="font-body-lg text-body-lg font-bold text-on-surface mb-2">คาดการณ์ล่วงหน้า</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">วิเคราะห์แนวโน้มราคา 3 เดือนด้วย AI อิงข้อมูล DIT และ OAE</p>
            </div>
            
            <div class="bg-surface p-space-lg rounded-2xl border border-surface-container-highest shadow-sm">
              <div class="w-12 h-12 bg-primary-fixed text-on-primary-fixed rounded-xl flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[24px]">calculate</span>
              </div>
              <h3 class="font-body-lg text-body-lg font-bold text-on-surface mb-2">ประเมินคุณภาพ</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">คำนวณราคาสุทธิหักความชื้นและสิ่งเจือปนตามมาตรฐานเป๊ะๆ</p>
            </div>
            
            <div class="bg-surface p-space-lg rounded-2xl border border-surface-container-highest shadow-sm">
              <div class="w-12 h-12 bg-secondary-fixed text-on-secondary-fixed rounded-xl flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[24px]">explore</span>
              </div>
              <h3 class="font-body-lg text-body-lg font-bold text-on-surface mb-2">จับคู่ลานรับซื้อ (GIS)</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">ค้นหาจุดรับซื้อที่ให้ผลตอบแทนคุ้มสุดหลังหักค่าขนส่งในรัศมีของคุณ</p>
            </div>
            
            <div class="bg-surface p-space-lg rounded-2xl border border-surface-container-highest shadow-sm">
              <div class="w-12 h-12 bg-error-container text-on-error-container rounded-xl flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-[24px]">rate_review</span>
              </div>
              <h3 class="font-body-lg text-body-lg font-bold text-on-surface mb-2">ตรวจสอบโปร่งใส</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">บันทึกประวัติการขาย และรีวิวลานรับซื้อเพื่อชุมชนเกษตรกร</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="py-8 text-center border-t border-surface-container">
        <p class="font-caption text-caption text-on-surface-variant">© 2026 AgriSmart — ระบบเกษตรอัจฉริยะ</p>
        <p class="font-caption text-[10px] text-outline mt-1">ข้อมูลอ้างอิงจาก กรมการค้าภายใน (DIT) และ สำนักงานเศรษฐกิจการเกษตร (OAE)</p>
      </footer>
    </div>
  `;
}
