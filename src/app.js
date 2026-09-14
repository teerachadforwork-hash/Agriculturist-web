// ══════════════════════════════════════════════════
// App Shell — Main Application Entry Point
// ══════════════════════════════════════════════════

import { registerRoute, initRouter, navigate, setBeforeNavigate } from './router.js';
import { isAuthenticated } from './auth.js';
import { checkPdpaConsent } from './utils/pdpa.js';
import { renderNavbar, initNavbarEvents } from './components/navbar.js';
import { renderLanding } from './pages/landing.js';
import { renderLogin, initLoginEvents } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCalculator, initCalculatorEvents } from './pages/calculator.js';
import { renderFacilityMap, initMapEvents, destroyMap } from './pages/facility-map.js';
import { renderPredictions, initPredictionsEvents, destroyPredictions } from './pages/predictions.js';
import { renderTransactions, initTransactionsEvents } from './pages/transactions.js';
import { renderCallback, initCallbackEvents } from './pages/callback.js';
import { renderFacilityDetail, initFacilityDetailEvents } from './pages/facility-detail.js';

const app = document.getElementById('app');
let currentPage = '';

// ── Page Renderer ──
async function renderPage(pageName, contentFn, initFn, params = {}) {
  // Cleanup previous page
  if (currentPage === 'map') destroyMap();
  if (currentPage === 'predictions') destroyPredictions();

  currentPage = pageName;

  const needsNav = !['landing', 'login', 'callback'].includes(pageName);
  const content = await contentFn(params);

  app.innerHTML = `
    ${needsNav ? renderNavbar() : ''}
    <main class="page-enter" id="page-main">
      ${content}
    </main>
  `;

  if (needsNav) initNavbarEvents();
  if (initFn) initFn(params);
}

// ── Auth Guard ──
const publicPages = ['/', '/login', '/callback'];

setBeforeNavigate((path) => {
  // Remove hash bang or hash before checking
  const cleanPath = path.split('?')[0];

  if (!publicPages.includes(cleanPath) && !isAuthenticated()) {
    navigate('/login');
    return false;
  }
  // Redirect to dashboard if already logged in and visiting landing/login
  if (['/login', '/'].includes(cleanPath) && isAuthenticated()) {
    navigate('/dashboard');
    return false;
  }
  return true;
});

// ── Register Routes ──
registerRoute('/', (params) => {
  renderPage('landing', renderLanding, null, params);
});

registerRoute('/login', (params) => {
  renderPage('login', renderLogin, initLoginEvents, params);
});

registerRoute('/callback', (params) => {
  renderPage('callback', renderCallback, initCallbackEvents, params);
});

registerRoute('/dashboard', (params) => {
  renderPage('calculator', renderCalculator, initCalculatorEvents, params);
});

registerRoute('/calculator', (params) => {
  renderPage('calculator', renderCalculator, initCalculatorEvents, params);
});

registerRoute('/map', (params) => {
  renderPage('map', renderFacilityMap, initMapEvents, params);
});

registerRoute('/predictions', (params) => {
  renderPage('predictions', renderPredictions, initPredictionsEvents, params);
});

registerRoute('/transactions', (params) => {
  renderPage('transactions', renderTransactions, initTransactionsEvents, params);
});

registerRoute('/facility/:id', (params) => {
  renderPage('facility', renderFacilityDetail, initFacilityDetailEvents, params);
});

registerRoute('/facility', (params) => {
  renderPage('facility', renderFacilityDetail, initFacilityDetailEvents, params);
});

// ── Initialize ──
initRouter();
checkPdpaConsent();
