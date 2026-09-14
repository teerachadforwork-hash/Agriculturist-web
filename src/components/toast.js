// ══════════════════════════════════════════════════
// Toast Component — ระบบแจ้งเตือน
// ══════════════════════════════════════════════════

let toastCounter = 0;

export function showToast(message, type = 'info', title = '', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = `toast-${++toastCounter}`;
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const toast = document.createElement('div');
  toast.id = id;
  toast.className = `toast toast-${type} toast-enter`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
    <span class="toast-close" onclick="this.parentElement.classList.replace('toast-enter','toast-exit');setTimeout(()=>this.parentElement.remove(),300)">✕</span>
  `;

  container.appendChild(toast);

  // Auto-remove
  if (duration > 0) {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.replace('toast-enter', 'toast-exit');
        setTimeout(() => el.remove(), 300);
      }
    }, duration);
  }

  return id;
}
