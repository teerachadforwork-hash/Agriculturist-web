import { navigate } from '../router.js';
import { loginWithProfile } from '../auth.js';
import { showToast } from '../utils/toast.js';

export function renderCallback() {
  return `
    <div class="min-h-screen flex items-center justify-center bg-surface px-margin">
      <div class="text-center space-y-4">
        <span class="material-symbols-outlined text-[48px] text-primary animate-spin">sync</span>
        <h2 class="font-headline-sm text-headline-sm font-bold text-on-surface">กำลังตรวจสอบสิทธิ์ LINE...</h2>
        <p class="font-body-sm text-body-sm text-on-surface-variant">กรุณารอสักครู่ ระบบกำลังเข้าสู่ระบบอย่างปลอดภัย</p>
      </div>
    </div>
  `;
}

export async function initCallbackEvents() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');
  
  if (error) {
    showToast(`LINE Login failed: ${urlParams.get('error_description') || error}`, 'error');
    navigate('/login');
    return;
  }

  const storedState = sessionStorage.getItem('line_oauth_state');
  if (state !== storedState) {
    showToast('Security Error: Invalid state parameter. Please try logging in again.', 'error');
    navigate('/login');
    return;
  }

  if (code) {
    try {
      // Exchange code for token using our custom Vite backend proxy
      const redirectUri = import.meta.env.VITE_LINE_CALLBACK_URL || (window.location.origin + '/#/callback');
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/auth/line?code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      const data = await response.json();
      
      if (data.success && data.profile) {
        loginWithProfile(data.profile);
        showToast(`ยินดีต้อนรับคุณ ${data.profile.displayName}`, 'success');
        navigate('/dashboard');
      } else {
        showToast('Authentication failed on server. ' + (data.error || ''), 'error');
        navigate('/login');
      }
    } catch (err) {
      console.error('Error during LINE token exchange:', err);
      showToast('Network or server error during authentication.', 'error');
      navigate('/login');
    }
  } else {
    navigate('/login');
  }
}
