// ── app.js ───────────────────────────────────────────────────────────────────
// Main app controller: router, service worker registration, nav wiring.
// ---------------------------------------------------------------------------

import { renderDashboard }    from './pages/dashboard.js';
import { renderCustomerPage } from './pages/customer.js';
import { renderSettings }     from './pages/settings.js';
import { showCustomerModal }  from './components/modal.js';
import { showToast }          from './components/toast.js';
import { isAuthenticated, showLoginScreen } from './components/auth.js';
import { checkAndAutoSync }   from './sync.js';
import { customers }          from './db.js';
import { generateId, todayStr } from './utils/format.js';

// ─────────────────────────── ROUTER ─────────────────────────────────────────

async function navigate(hash) {
  const raw   = (hash || '').replace(/^#/, '');
  const parts = raw.split('/');
  const page  = parts[0] || 'dashboard';
  const param = parts[1];

  // Update active nav button
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  const navMap = { dashboard: 'nav-dashboard', settings: 'nav-settings' };
  if (navMap[page]) {
    document.getElementById(navMap[page])?.classList.add('active');
  }

  // Hide bottom nav on detail pages (like customer)
  const bnav = document.getElementById('bottom-nav');
  if (bnav) {
    if (page === 'customer') bnav.style.display = 'none';
    else bnav.style.display = '';
  }

  switch (page) {
    case 'customer':
      if (param) await renderCustomerPage(param);
      else window.location.hash = '#dashboard';
      break;

    case 'settings':
      document.getElementById('nav-settings')?.classList.add('active');
      await renderSettings();
      break;

    default: // 'dashboard'
      document.getElementById('nav-dashboard')?.classList.add('active');
      await renderDashboard();
  }

  // Scroll to top on page change
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ─────────────────────────── SERVICE WORKER ─────────────────────────────────

async function unregisterSW() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    } catch (err) {
      console.info('Failed to unregister SW:', err.message);
    }
  }
}

// ─────────────────────────── NAVIGATION WIRING ──────────────────────────────

function initNav() {
  window.addEventListener('hashchange', () => navigate(window.location.hash));

  // Bottom nav buttons
  document.getElementById('nav-dashboard')?.addEventListener('click', () => {
    window.location.hash = '#dashboard';
  });

  document.getElementById('nav-settings')?.addEventListener('click', () => {
    window.location.hash = '#settings';
  });

  // "Add Customer" nav button (centre FAB in bottom nav)
  document.getElementById('nav-add-customer')?.addEventListener('click', async () => {
    const data = await showCustomerModal(null);
    if (!data) return;
    const customer = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
    };
    await customers.add(customer);
    showToast(`${customer.name} added!`, 'success');
    window.location.hash = `#customer/${customer.id}`;
  });
}

// ─────────────────────────── BOOT ───────────────────────────────────────────

async function boot() {
  const startApp = async () => {
    try {
      // Unregister service workers to disable PWA offline cache
      unregisterSW();

      // Reveal UI
      document.getElementById('loading-screen')?.classList.add('fade-out');
      setTimeout(() => {
        document.getElementById('loading-screen')?.remove();
      }, 400);
      document.getElementById('bottom-nav')?.classList.remove('hidden');

      // Wire navigation
      initNav();

      // Navigate to current hash (or default dashboard)
      await navigate(window.location.hash);

      // Trigger background auto-sync
      checkAndAutoSync();

    } catch (err) {
      console.error('Boot error:', err);
      document.getElementById('loading-screen').innerHTML = `
        <div class="loading-logo">
          <div style="font-size:2rem">⚠</div>
          <h1>Something went wrong</h1>
          <p>${err.message}</p>
          <button onclick="location.reload()" style="margin-top:1rem;padding:.6rem 1.4rem;border-radius:8px;background:#fff;color:#000;border:none;cursor:pointer;font-weight:600;font-family:inherit">Reload App</button>
        </div>
      `;
    }
  };

  if (isAuthenticated()) {
    startApp();
  } else {
    // Hide standard loading if auth screen is going to overlay it, but auth screen is opaque anyway.
    showLoginScreen(startApp);
  }
}

boot();
