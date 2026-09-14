import { getUser, logout } from '../auth.js';

export function renderNavbar() {
  const user = getUser();
  
  if (!user) return '';

  const userName = user.lineDisplayName || user.name || 'ผู้ใช้งาน';
  const userPic = user.pictureUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCY9CXe7RsiKGzQp5gvUMBZfZZ6kCD8PKEQnkEWJHfy_YvHubU1M56_nWYe2ZTXCGrPoudOhJaC47Z3MXNRSZHPOqQByDFhndZV2mKlJWe7mLEZzEoeRxud-I7musfcjQSnQkURg4H5sdvQFpI6p4oeJLUSqvI_FyXp-XDqREEh_qFD1mPbL0npxfHl2xPtyeTUWERX27cyH2ikiS4Ck18L7G3s7NXd_rwrboQUoFZYfaJ7Oq0EqMsPgA';

  return `
    <!-- Top Header -->
    <header class="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
      <div class="h-20 max-w-xl mx-auto px-margin flex items-center justify-between gap-space-sm">
        
        <!-- Logo & Status -->
        <div class="flex items-center gap-space-sm min-w-0 flex-1 cursor-pointer" id="nav-logo">
          <img alt="AgriSmart Logo" class="h-8 w-auto object-contain flex-shrink-0" src="https://lh3.googleusercontent.com/aida/AEtjO1VEnNrjEtG8-bNq-0JZtLHiUBhZH4bXJDM2RcoVY0vfRHMwPtbv6J9Hq-PKV6ld7SdBIZnbb9VuohPAaAVzQ-QbXs26Y6qVrTovmN1bqTWEnqaGF-QjL81RsjcvyxcBL0_-mZyP8Xzf8j4RGEp5_izKNs3-IeK8XQ8_8WKCNF_1BOhOnofwMmzQ6Pt-JpbRXGL4a5_ewI_Y9npgo6TmlV42--04nLYkq5POcOoGct39DK-0tw8FsV82CY_V" />
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-space-xs">
              <span class="font-headline-sm text-headline-sm text-primary font-bold truncate leading-none">AgriSmart</span>
              <span class="text-[11px] font-medium text-on-surface-variant leading-none hidden sm:inline">เกษตรกรอัจฉริยะ</span>
            </div>
            <div class="flex items-center gap-1.5 mt-1">
              <span class="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              <span class="font-caption text-caption text-on-surface-variant truncate">ออนไลน์ 4G / พร้อมบันทึกร่าง</span>
            </div>
          </div>
        </div>

        <!-- User Profile (Click to logout for now) -->
        <div class="flex items-center gap-space-xs flex-shrink-0 pl-space-xs cursor-pointer" id="nav-profile">
          <div class="flex flex-col items-end min-w-0 max-w-[120px]">
            <span class="font-body-sm text-body-sm font-semibold text-on-surface truncate leading-tight">${userName}</span>
            <div class="flex items-center gap-1 leading-none">
              <span class="w-1.5 h-1.5 rounded-full bg-[#06C755]"></span>
              <span class="font-caption text-[10px] text-on-surface-variant font-medium">LINE ยืนยัน</span>
            </div>
          </div>
          <div class="relative flex-shrink-0">
            <img alt="Profile" class="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/40" src="${userPic}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=006d30&color=fff'" />
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary ring-1 ring-surface"></span>
          </div>
        </div>

      </div>
    </header>

    <!-- Bottom Mobile Navigation -->
    <nav class="fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div class="max-w-xl mx-auto grid grid-cols-4 h-20 items-center px-space-xs">
        
        <a href="#/calculator" class="nav-item flex flex-col items-center justify-center gap-1 h-full min-h-[48px] text-on-surface-variant hover:text-primary transition-colors duration-150" data-path="/calculator">
          <span class="material-symbols-outlined text-[24px]">calculate</span>
          <span class="font-caption text-caption text-center leading-none">ประเมินราคา</span>
        </a>
        
        <a href="#/map" class="nav-item flex flex-col items-center justify-center gap-1 h-full min-h-[48px] text-on-surface-variant hover:text-primary transition-colors duration-150" data-path="/map">
          <span class="material-symbols-outlined text-[24px]">distance</span>
          <span class="font-caption text-caption text-center leading-none">ค้นหาลานรับซื้อ</span>
        </a>
        
        <a href="#/predictions" class="nav-item flex flex-col items-center justify-center gap-1 h-full min-h-[48px] text-on-surface-variant hover:text-primary transition-colors duration-150" data-path="/predictions">
          <span class="material-symbols-outlined text-[24px]">trending_up</span>
          <span class="font-caption text-caption text-center leading-none">เตือนภัยราคา</span>
        </a>
        
        <a href="#/transactions" class="nav-item flex flex-col items-center justify-center gap-1 h-full min-h-[48px] text-on-surface-variant hover:text-primary transition-colors duration-150" data-path="/transactions">
          <span class="material-symbols-outlined text-[24px]">receipt_long</span>
          <span class="font-caption text-caption text-center leading-none">ประวัติการขาย</span>
        </a>

      </div>
    </nav>
  `;
}

export function initNavbarEvents() {
  const currentPath = window.location.hash.replace('#', '').split('?')[0];
  
  // Highlight active tab
  document.querySelectorAll('.nav-item').forEach(el => {
    if (currentPath.includes(el.getAttribute('data-path')) || (currentPath === '/dashboard' && el.getAttribute('data-path') === '/calculator')) {
      el.classList.remove('text-on-surface-variant');
      el.classList.add('text-primary', 'font-semibold');
      // Fill the icon if active
      const icon = el.querySelector('.material-symbols-outlined');
      if (icon) icon.style.fontVariationSettings = "'FILL' 1";
    }
  });

  const logo = document.getElementById('nav-logo');
  if (logo) {
    logo.addEventListener('click', () => {
      window.location.hash = '#/dashboard';
    });
  }

  const profile = document.getElementById('nav-profile');
  if (profile) {
    profile.addEventListener('click', () => {
      if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        logout();
        window.location.hash = '#/login';
      }
    });
  }
}
