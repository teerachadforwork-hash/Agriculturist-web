import { isAuthenticated, getToken } from '../auth.js';

const PDPA_STORAGE_PREFIX = 'pdpa_consent:';

export function hasPdpaConsent() {
    const user = JSON.parse(sessionStorage.getItem('agriculturist_auth') || 'null');
    const userId = user?.id;

    if (!userId) return false;

    return localStorage.getItem(`${PDPA_STORAGE_PREFIX}${userId}`) === 'true';
}

export function checkPdpaConsent() {
    if (!isAuthenticated()) return;
    if (hasPdpaConsent()) return;

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      id="pdpa-overlay">
      <div class="bg-surface rounded-2xl p-6 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto
        transform transition-all">
        <div class="w-12 h-12 bg-primary-container text-on-primary-container rounded-full
          flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-[24px]">policy</span>
        </div>

        <h2 class="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
          ข้อตกลงและนโยบายความเป็นส่วนตัว (PDPA)
        </h2>

        <div class="text-body-sm text-on-surface-variant space-y-3 mb-6">
          <p>
            แอปพลิเคชัน <strong>เกษตรอัจฉริยะ</strong>
            ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของท่าน
            เพื่อให้ท่านสามารถใช้บริการได้อย่างมั่นใจ
            เราจึงขอความยินยอมในการเก็บรวบรวมและใช้ข้อมูลดังต่อไปนี้:
          </p>

          <ul class="list-disc pl-5 space-y-1">
            <li><strong>ข้อมูลโปรไฟล์ LINE:</strong>
              เพื่อใช้ในการยืนยันตัวตนและสร้างบัญชีผู้ใช้งาน</li>
            <li><strong>ข้อมูลตำแหน่งที่ตั้ง (GPS):</strong>
              เพื่อแนะนำลานรับซื้อที่ใกล้ที่สุดและคำนวณค่าขนส่ง</li>
            <li><strong>ข้อมูลธุรกรรมผลผลิต:</strong>
              เพื่อบันทึกประวัติการขายและวิเคราะห์ราคาตลาด</li>
          </ul>

          <p>
            ข้อมูลของท่านจะถูกจัดเก็บอย่างปลอดภัยและไม่ถูกเปิดเผยต่อบุคคลที่สามโดยไม่ได้รับอนุญาต
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <button id="btn-accept-pdpa"
            class="w-full py-3 bg-primary text-on-primary rounded-xl font-bold
            hover:bg-primary/90 active:scale-95 transition-all">
            ยินยอมและดำเนินการต่อ
          </button>

          <button id="btn-reject-pdpa"
            class="w-full py-3 bg-surface-container text-on-surface rounded-xl font-bold
            hover:bg-surface-container-high active:scale-95 transition-all">
            ปฏิเสธ (ออกจากแอป)
          </button>
        </div>
      </div>
    </div>
  `;

    document.getElementById('btn-accept-pdpa').addEventListener('click', async () => {
        try {
            const token = getToken();

            if (!token) {
                throw new Error('Authentication required before recording PDPA consent');
            }

            let baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

            if (!baseUrl) {
                throw new Error('VITE_API_BASE_URL is not configured');
            }

            if (!baseUrl.startsWith('http')) {
                baseUrl = 'https://' + baseUrl;
            }

            const response = await fetch(`${baseUrl}/api/auth/consent`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: 'pdpa',
                    granted: true,
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error(`PDPA consent request returned HTTP ${response.status}`);
            }

            if (!response.ok || data.ok !== true) {
                throw new Error(data?.error || 'Failed to record PDPA consent');
            }

            const user = JSON.parse(sessionStorage.getItem('agriculturist_auth') || 'null');
            const userId = user?.id;
            if (!userId) {
                throw new Error('Authenticated user ID is missing');
            }

            localStorage.setItem(`${PDPA_STORAGE_PREFIX}${userId}`, 'true');
            modalContainer.innerHTML = '';
        } catch (error) {
            console.error('Failed to record PDPA consent:', error);
            alert('ไม่สามารถบันทึกความยินยอมได้ กรุณาลองใหม่อีกครั้ง');
        }
    });

    document.getElementById('btn-reject-pdpa').addEventListener('click', () => {
        alert('ท่านจำเป็นต้องยินยอมเพื่อใช้งานแอปพลิเคชัน');
        window.location.href = 'https://google.com';
    });
}