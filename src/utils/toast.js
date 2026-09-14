export function showToast(message, type = 'info') {
  // Create container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  let bgClass, iconClass, iconName;

  if (type === 'error') {
    bgClass = 'bg-error-container text-on-error-container';
    iconClass = 'text-error';
    iconName = 'error';
  } else if (type === 'success') {
    bgClass = 'bg-primary-container text-on-primary-container';
    iconClass = 'text-primary';
    iconName = 'check_circle';
  } else {
    bgClass = 'bg-surface-container-high text-on-surface';
    iconClass = 'text-on-surface-variant';
    iconName = 'info';
  }

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 translate-y-8 opacity-0 ${bgClass}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined ${iconClass} text-[20px]">${iconName}</span>
    <span class="font-body-sm text-body-sm font-medium flex-1">${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-8', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Remove after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-8', 'opacity-0');
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 3500);
}
