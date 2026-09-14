import { fetchTransactions } from '../services/api.js';

let renderedTransactions = [];

function formatMoney(value) {
  if (value === null || value === undefined) return 'รอยืนยัน';
  return `฿${Math.round(value).toLocaleString('th-TH')}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(date));
}

function renderStatus(tx) {
  const labels = {
    completed: ['รับเงินแล้ว', 'bg-primary-fixed text-on-primary-fixed'],
    pending: ['รอขาย', 'bg-surface-container-high text-on-surface-variant'],
    draft: ['ร่างในเครื่อง', 'bg-tertiary-fixed text-on-tertiary-fixed'],
  };
  const [label, className] = labels[tx.status] || labels.pending;
  return `<span class="font-caption text-[10px] ${className} px-1.5 py-0.5 rounded-full font-bold">${label}</span>`;
}

function renderTransaction(tx) {
  const unit = tx.cropId === 'sugarcane' ? 'ตัน' : 'กก.';
  const quality = tx.qualityLabel ? `${tx.qualityLabel} ${tx.qualityMetric}` : `คุณภาพ ${tx.qualityMetric}`;
  return `
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-full ${tx.status === 'completed' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface'} flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-[20px]">${tx.status === 'completed' ? 'check_circle' : tx.status === 'draft' ? 'save' : 'history'}</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="font-body-sm text-body-sm font-bold text-on-surface truncate">${tx.facilityName || 'ยังไม่เลือกลานรับซื้อ'}</h3>
        <p class="font-caption text-caption text-on-surface-variant truncate">${formatDate(tx.date)} • ${tx.cropName || tx.cropId} ${Number(tx.totalWeight).toLocaleString('th-TH')} ${unit} • <span class="text-tertiary">${quality}</span></p>
      </div>
      <div class="text-right flex-shrink-0">
        <div class="font-body-lg text-body-lg font-bold ${tx.status === 'completed' ? 'text-primary' : 'text-on-surface'}">${formatMoney(tx.actualReceived ?? tx.predictedPrice)}</div>
        ${renderStatus(tx)}
      </div>
    </div>
  `;
}

export async function renderTransactions() {
  renderedTransactions = await fetchTransactions();
  const completedTotal = renderedTransactions
    .filter(tx => tx.status === 'completed')
    .reduce((sum, tx) => sum + Number(tx.actualReceived || tx.predictedPrice || 0), 0);

  return `
    <div class="flex flex-col w-full space-y-space-md pt-20 pb-24 max-w-xl mx-auto px-margin">
      <div class="flex items-center justify-between">
        <h1 class="font-headline-lg text-headline-lg font-bold text-on-surface">ประวัติการขาย</h1>
        <span class="font-label-badge text-label-badge bg-surface-container text-on-surface-variant px-2 py-0.5 rounded">${renderedTransactions.length} รายการ</span>
      </div>

      <section class="grid grid-cols-2 gap-space-sm">
        <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
          <span class="font-caption text-caption text-on-surface-variant block">ยอดรับเงินจริงสะสม</span>
          <strong class="font-headline-sm text-headline-sm text-primary">฿${Math.round(completedTotal).toLocaleString('th-TH')}</strong>
        </div>
        <div class="bg-surface-container-lowest rounded-xl shadow-sm p-space-md">
          <span class="font-caption text-caption text-on-surface-variant block">ร่าง/รอขาย</span>
          <strong class="font-headline-sm text-headline-sm text-tertiary">${renderedTransactions.filter(tx => tx.status !== 'completed').length.toLocaleString('th-TH')}</strong>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-xl shadow-md p-space-md space-y-space-sm">
        <div class="flex items-center justify-between pb-2 border-b border-surface-container-high">
          <div class="flex items-center gap-space-xs">
            <span class="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
            <h2 class="font-headline-sm text-headline-sm text-on-surface">ประวัติย้อนหลัง</h2>
          </div>
        </div>

        <div class="space-y-3 pt-2">
          ${renderedTransactions.length > 0
      ? renderedTransactions.map((tx, index) => `${index > 0 ? '<hr class="border-surface-container" />' : ''}${renderTransaction(tx)}`).join('')
      : '<p class="font-body-sm text-body-sm text-on-surface-variant">ยังไม่มีประวัติ ลองบันทึกร่างจากหน้าเครื่องคำนวณก่อน</p>'}
        </div>

        <button id="btn-export-csv" type="button" class="w-full mt-4 h-12 bg-surface-container-low hover:bg-surface-container text-tertiary rounded-xl font-body-sm text-body-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
          <span class="material-symbols-outlined text-[18px]">download</span>
          <span>ดาวน์โหลดสมุดบัญชีสรุปรายรับ (CSV)</span>
        </button>
      </section>

      <div class="flex items-start gap-3 bg-surface-container p-4 rounded-xl">
        <div class="w-8 h-8 rounded-full bg-surface-container-highest text-outline flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-[18px]">security</span>
        </div>
        <div>
          <h4 class="font-body-sm text-body-sm font-bold text-on-surface">การคุ้มครองข้อมูลเกษตรกร (PDPA & Anonymity)</h4>
          <p class="font-caption text-caption text-on-surface-variant mt-1">ข้อมูลราคาและความชื้นจริงหน้าตราชั่งจะถูกนำไปรวบรวมเป็นค่าเฉลี่ยดัชนีชุมชนแบบไม่ระบุตัวตน ระบบไม่เปิดเผยชื่อ พิกัดแปลง หรือข้อมูลส่วนบุคคล</p>
        </div>
      </div>
    </div>
  `;
}

export function initTransactionsEvents() {
  const btn = document.getElementById('btn-export-csv');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const header = ['date', 'crop', 'facility', 'weight', 'quality', 'predicted', 'actual', 'status'];
    const rows = renderedTransactions.map(tx => [
      tx.date,
      tx.cropName || tx.cropId,
      tx.facilityName || '',
      tx.totalWeight,
      `${tx.qualityLabel || ''} ${tx.qualityMetric || ''}`.trim(),
      tx.predictedPrice || '',
      tx.actualReceived || '',
      tx.status,
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agriculturist-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });
}
