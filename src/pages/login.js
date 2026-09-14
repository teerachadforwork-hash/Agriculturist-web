import { initiateLineLogin, loginWithToken } from '../auth.js';
import { checkPdpaConsent } from '../utils/pdpa.js';
import { showToast } from '../utils/toast.js';

export function renderLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-surface px-margin relative overflow-hidden">
      
      <!-- Background Graphic -->
      <div class="absolute inset-0 z-0">
        <div class="absolute top-0 right-0 w-64 h-64 bg-primary-fixed/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div class="absolute bottom-0 left-0 w-80 h-80 bg-tertiary-fixed/20 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4"></div>
      </div>

      <div class="w-full max-w-sm space-y-space-xl relative z-10 fade-in">
        <!-- Header -->
        <div class="text-center space-y-4">
          <div class="w-20 h-20 bg-surface-container-lowest rounded-2xl shadow-sm mx-auto flex items-center justify-center border border-surface-container-highest">
            <img src="https://lh3.googleusercontent.com/aida/AEtjO1VEnNrjEtG8-bNq-0JZtLHiUBhZH4bXJDM2RcoVY0vfRHMwPtbv6J9Hq-PKV6ld7SdBIZnbb9VuohPAaAVzQ-QbXs26Y6qVrTovmN1bqTWEnqaGF-QjL81RsjcvyxcBL0_-mZyP8Xzf8j4RGEp5_izKNs3-IeK8XQ8_8WKCNF_1BOhOnofwMmzQ6Pt-JpbRXGL4a5_ewI_Y9npgo6TmlV42--04nLYkq5POcOoGct39DK-0tw8FsV82CY_V" alt="AgriSmart Logo" class="w-12 h-12 object-contain" />
          </div>
          <div>
            <h1 class="font-headline-lg text-headline-lg font-bold text-on-surface">เข้าสู่ระบบ</h1>
            <p class="font-body-md text-body-md text-on-surface-variant mt-2">AgriSmart เกษตรกรอัจฉริยะ</p>
          </div>
        </div>

        <!-- Login Button -->
        <div class="space-y-4 pt-4">
          <button id="btn-login-line" type="button" class="w-full h-14 bg-[#06C755] hover:bg-[#05b34c] active:scale-[0.98] transition-all text-white rounded-xl font-body-lg text-body-lg font-bold flex items-center justify-center gap-3 shadow-md">
            <!-- LINE Icon SVG -->
            <svg viewBox="0 0 24 24" class="w-6 h-6 fill-current">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992zm-18.988-1.579c0-.441.359-.8.8-.8h3.359c.441 0 .8.359.8.8v.011c0 .441-.359.8-.8.8h-2.559v1.27h2.559c.441 0 .8.359.8.8v.011c0 .441-.359.8-.8.8h-2.559v1.27h2.559c.441 0 .8.359.8.8v.011c0 .441-.359.8-.8.8h-3.359c-.441 0-.8-.359-.8-.8v-5.913zm6.652 5.913c0 .441-.359.8-.8.8h-.011c-.441 0-.8-.359-.8-.8v-5.913c0-.441.359-.8.8-.8h.011c.441 0 .8.359.8.8v5.913zm4.565-.8c0 .441-.359.8-.8.8h-3.359c-.441 0-.8-.359-.8-.8v-5.913c0-.441.359-.8.8-.8h.011c.441 0 .8.359.8.8v4.333h2.559c.441 0 .8.359.8.8v.011zM18.89 8.725h-.011c-.441 0-.8.359-.8.8v5.913c0 .441.359.8.8.8h.011c.441 0 .8-.359.8-.8v-5.913c0-.441-.359-.8-.8-.8z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย LINE</span>
          </button>
          <button id="btn-login-demo" type="button" class="w-full h-12 bg-surface-container-low hover:bg-surface-container active:scale-[0.98] transition-all text-on-surface rounded-xl font-body-md text-body-md font-bold flex items-center justify-center gap-2 shadow-sm">
            <span class="material-symbols-outlined text-[20px]">agriculture</span>
            <span>ทดลองใช้งานระบบในเครื่อง</span>
          </button>
          
          <p class="text-center font-caption text-caption text-on-surface-variant px-4">
            เข้าสู่ระบบเพื่อบันทึกข้อมูลและประเมินราคาสินค้าเกษตรของคุณอย่างแม่นยำ
          </p>
        </div>
      </div>
    </div>
  `;
}

export function initLoginEvents() {
  document.getElementById('btn-login-line').addEventListener('click', () => {
    initiateLineLogin();
  });
  document.getElementById('btn-login-demo').addEventListener('click', async () => {
    try {
      let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

      if (!baseUrl) {
        throw new Error('VITE_API_BASE_URL is not configured');
      }

      if (!baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
      }

      const response = await fetch(`${baseUrl}/api/auth/demo`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.token || !data.user) {
        throw new Error(data?.error || 'Demo authentication failed');
      }

      loginWithToken(data.token, data.user);
      checkPdpaConsent();

      window.location.hash = '#/dashboard';
    } catch (error) {
      console.error('Demo login failed:', error);
      showToast(
        'ไม่สามารถเข้าสู่ระบบ Demo ได้ กรุณาลองใหม่อีกครั้ง',
        'error'
      );
    }
  });
}
