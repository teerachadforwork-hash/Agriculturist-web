// ══════════════════════════════════════════════════
// Router — Client-side Hash Router
// ══════════════════════════════════════════════════

const routes = {};
let currentPath = '';
let beforeNavigateHook = null;

export function registerRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return currentPath;
}

export function setBeforeNavigate(hook) {
  beforeNavigateHook = hook;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('load', handleRoute);
}

async function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, ...queryParts] = hash.split('?');
  const params = {};

  if (queryParts.length > 0) {
    const searchParams = new URLSearchParams(queryParts.join('?'));
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
  }

  // Auth guard
  if (beforeNavigateHook) {
    const canProceed = beforeNavigateHook(path);
    if (!canProceed) return;
  }

  currentPath = path;

  // Find matching route
  let handler = routes[path];
  let routeParams = {};

  if (!handler) {
    for (const [routePath, routeHandler] of Object.entries(routes)) {
      if (!routePath.includes(':')) continue;

      const routeParts = routePath.split('/').filter(Boolean);
      const pathParts = path.split('/').filter(Boolean);
      if (routeParts.length !== pathParts.length) continue;

      const candidateParams = {};
      const isMatch = routeParts.every((part, index) => {
        if (part.startsWith(':')) {
          candidateParams[part.slice(1)] = decodeURIComponent(pathParts[index]);
          return true;
        }
        return part === pathParts[index];
      });

      if (isMatch) {
        handler = routeHandler;
        routeParams = candidateParams;
        break;
      }
    }
  }

  if (handler) {
    await handler({ ...params, ...routeParams });
  } else {
    // 404 — fallback to landing
    navigate('/');
  }
}
