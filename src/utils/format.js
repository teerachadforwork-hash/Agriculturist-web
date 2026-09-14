// ══════════════════════════════════════════════════
// Format Utilities — จัดรูปแบบตัวเลข
// ══════════════════════════════════════════════════

/**
 * จัดรูปแบบเงินบาท
 */
export function formatCurrency(amount, decimals = 0) {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * จัดรูปแบบตัวเลขทั่วไป
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * จัดรูปแบบน้ำหนัก
 */
export function formatWeight(kg, unit = 'กก.') {
  if (kg === null || kg === undefined) return '-';
  return `${formatNumber(kg)} ${unit}`;
}

/**
 * จัดรูปแบบระยะทาง
 */
export function formatDistance(km) {
  if (km === null || km === undefined) return '-';
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${formatNumber(km, 1)} กม.`;
}

/**
 * จัดรูปแบบเปอร์เซ็นต์
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, decimals)}%`;
}

/**
 * จัดรูปแบบวันที่ไทย
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * จัดรูปแบบวันที่แบบสั้น
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * สร้างข้อความ relative time (เช่น "2 วันที่แล้ว")
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === 1) return 'เมื่อวาน';
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
  return `${Math.floor(diffDays / 365)} ปีที่แล้ว`;
}

/**
 * สร้างสีสำหรับ change indicator
 */
export function getChangeColor(value) {
  if (value > 0) return 'var(--color-primary-400)';
  if (value < 0) return 'var(--color-danger-400)';
  return 'var(--color-text-muted)';
}

/**
 * สร้าง arrow icon สำหรับ change
 */
export function getChangeArrow(value) {
  if (value > 0) return '↑';
  if (value < 0) return '↓';
  return '→';
}
