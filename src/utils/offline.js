// ══════════════════════════════════════════════════
// Offline / Draft Mode — ตาม specific.md
// ตรวจจับสถานะ network + cache pricing rules
// ══════════════════════════════════════════════════

let _isOnline = navigator.onLine;
const _listeners = [];

// ── Event Listeners ──
window.addEventListener('online', () => {
  _isOnline = true;
  _notifyListeners();
  syncDrafts();
});

window.addEventListener('offline', () => {
  _isOnline = false;
  _notifyListeners();
});

function _notifyListeners() {
  _listeners.forEach(fn => fn(_isOnline));
}

export function isOnline() {
  return _isOnline;
}

export function onConnectivityChange(callback) {
  _listeners.push(callback);
  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx > -1) _listeners.splice(idx, 1);
  };
}

// ── Draft Mode ──
const DRAFTS_KEY = 'agriculturist_drafts';
const CACHED_RULES_KEY = 'agriculturist_cached_rules';
const CACHED_PRICES_KEY = 'agriculturist_cached_prices';

/**
 * บันทึกร่าง (Draft) เมื่อ offline
 */
export function saveDraft(draft) {
  const drafts = getDrafts();
  drafts.push({ ...draft, id: `draft-${Date.now()}`, savedAt: new Date().toISOString() });
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  return drafts;
}

export function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearDrafts() {
  localStorage.removeItem(DRAFTS_KEY);
}

/**
 * Sync drafts เมื่อกลับมา online
 */
async function syncDrafts() {
  const drafts = getDrafts();
  if (drafts.length === 0) return;

  // ในระบบจริง: ส่งแต่ละ draft ไป POST /api/transactions
  console.log(`[Offline Sync] Syncing ${drafts.length} drafts...`);
  // หลัง sync สำเร็จ
  // clearDrafts();
}

/**
 * Cache pricing rules สำหรับ offline use
 */
export function cachePricingRules(rules) {
  localStorage.setItem(CACHED_RULES_KEY, JSON.stringify({
    data: rules,
    cachedAt: new Date().toISOString(),
  }));
}

export function getCachedPricingRules() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHED_RULES_KEY) || 'null');
    return cached ? cached.data : null;
  } catch {
    return null;
  }
}

/**
 * Cache ราคากลาง
 */
export function cachePrices(prices) {
  localStorage.setItem(CACHED_PRICES_KEY, JSON.stringify({
    data: prices,
    cachedAt: new Date().toISOString(),
  }));
}

export function getCachedPrices() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHED_PRICES_KEY) || 'null');
    return cached ? cached.data : null;
  } catch {
    return null;
  }
}
