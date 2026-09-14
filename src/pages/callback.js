import { navigate } from '../router.js';
import { loginWithToken } from '../auth.js';
import { checkPdpaConsent } from '../utils/pdpa.js';
import { showToast } from '../utils/toast.js';

export function renderCallback() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-surface px-margin">
      <div class="text-center space-y-4">
        <span class="material-symbols-outlined text-[48px] text-primary animate-spin">sync</span>
        <h2 class="font-headline-sm text-headline-sm font-bold text-on-surface">
          กำลังตรวจสอบ LINE...
        </h2>
        <p class="font-body-sm text-body-sm text-on-surface-variant">
          กรุณารอสักครู่ ระบบกำลังตรวจสอบการเข้าสู่ระบบของคุณ
        </p>
      </div>
    </div>
  `;
}

export async function initCallbackEvents(params = {}) {
  const searchParams = new URLSearchParams(window.location.search);

  const code = params.code || searchParams.get('code');
  const state = params.state || searchParams.get('state');
  const error = params.error || searchParams.get('error');

  if (error) {
    console.error('LINE Login failed:', error);

    showToast(
      'การเข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      'error'
    );

    navigate('/login');
    return;
  }

  if (!code || !state) {
    console.error('LINE callback missing code or state');

    showToast(
      'ข้อมูลการเข้าสู่ระบบจาก LINE ไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง',
      'error'
    );

    navigate('/login');
    return;
  }

  try {
    let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

    if (!baseUrl) {
      throw new Error('VITE_API_BASE_URL is not configured');
    }

    if (!baseUrl.startsWith('http')) {
      baseUrl = 'https://' + baseUrl;
    }

    const response = await fetch(`${baseUrl}/api/auth/line`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        state,
      }),
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(`Authentication server returned HTTP ${response.status}`);
    }

    if (!response.ok) {
      console.error('LINE authentication request failed:', response.status);
      throw new Error(data?.error || 'Authentication request failed');
    }

    if (data.success && data.token && data.user) {
      loginWithToken(data.token, data.user);
      checkPdpaConsent();

      showToast(
        `ยินดีต้อนรับ ${data.user.lineDisplayName || 'ผู้ใช้งาน'}`,
        'success'
      );

      navigate('/dashboard');
      return;
    }

    console.error('LINE authentication rejected');
    showToast(
      'การเข้าสู่ระบบด้วย LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      'error'
    );

    navigate('/login');
  } catch (err) {
    console.error('Error during LINE authentication:', err);

    showToast(
      'ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง',
      'error'
    );

    navigate('/login');
  }
}
