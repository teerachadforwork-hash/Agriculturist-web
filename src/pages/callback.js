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

export async function initCallbackEvents(params = {}) {
  const searchParams = new URLSearchParams(window.location.search);
  const code = params.code || searchParams.get('code');
  const state = params.state || searchParams.get('state');
  const error = params.error || searchParams.get('error');
  
  if (error) {
    alert(`LINE Login failed: ${params.error_description || searchParams.get('error_description') || error}`);
    navigate('/login');
    return;
  }

  const storedState = sessionStorage.getItem('line_oauth_state');
  if (state !== storedState) {
    alert(`Security Error: Invalid state parameter.\nExpected: ${storedState}\nReceived: ${state}`);
    navigate('/login');
    return;
  }

  if (code) {
    try {
      // Exchange code for token using our custom Vite backend proxy
      const redirectUri = import.meta.env.VITE_LINE_CALLBACK_URL || (window.location.origin + '/#/callback');
      let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
      if (baseUrl && !baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
      }
      const targetUrl = `${baseUrl}/api/auth/line?code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const response = await fetch(targetUrl);
      
      const data = await response.json();
      
      if (data.success && data.profile) {
        loginWithProfile(data.profile);
        showToast(`ยินดีต้อนรับคุณ ${data.profile.displayName}`, 'success');
        navigate('/dashboard');
      } else {
        alert('Authentication failed on server.\nError: ' + (data.error || 'Unknown error') + '\n\nเช็คที่ Render Backend ว่าตั้งค่า LINE_CHANNEL_SECRET หรือยัง?');
        navigate('/login');
      }
    } catch (err) {
      console.error('Error during LINE token exchange:', err);
      
      let fetchUrlInfo = "Unknown URL";
      try {
        let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
        if (baseUrl && !baseUrl.startsWith('http')) {
          baseUrl = 'https://' + baseUrl;
        }
        fetchUrlInfo = `${baseUrl}/api/auth/line`;
      } catch (e) {}

      alert('Network or server error during authentication.\nMessage: ' + err.message + '\nURL: ' + fetchUrlInfo + '\n\nถ้า URL ผิดแปลว่า Blueprint รันไม่สมบูรณ์ หรือลืม Sync ครับ');
      navigate('/login');
    }
  } else {
    alert('Missing code parameter from LINE.\nURL: ' + window.location.href);
    navigate('/login');
  }
}
