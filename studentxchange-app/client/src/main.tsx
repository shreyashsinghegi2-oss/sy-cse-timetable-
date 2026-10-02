import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/collab-enhanced.css";
import "./styles/lancing-design-system.css";
import { CacheManager, SEOManager } from "./utils/seo";
import { AppErrorBoundary } from "./components/app-error-boundary";

const SUPPRESSED_PATTERNS = [
  'missing or insufficient permissions',
  'permission-denied',
  'firebaseerror',
  'aborterror',
  'abort',
  'cancelled',
  'canceled',
  'auth_silent_fail',
  'auth/internal-error',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/popup-blocked',
  'auth/unauthorized-domain',
  'invalid jwt token',
  '401',
  'failed to fetch',
  'load failed',
  'network request failed',
  'networkerror',
  'chunk',
];

const shouldSuppressError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error?.message || String(error)).toLowerCase();
  const name = (error?.name || '').toLowerCase();
  const code = (error?.code || '').toLowerCase();
  return SUPPRESSED_PATTERNS.some(p => msg.includes(p) || name.includes(p) || code.includes(p));
};

window.addEventListener('unhandledrejection', (event) => {
  if (shouldSuppressError(event.reason)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
}, true);

window.addEventListener('error', (event) => {
  if (shouldSuppressError(event.error) ||
      (event.message && SUPPRESSED_PATTERNS.some(p => event.message.toLowerCase().includes(p)))) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
}, true);

const backgroundInit = () => {
  try {
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

    if (isDev && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      }).catch(() => {});
    }

    try {
      if (CacheManager && typeof CacheManager.needsUpdate === 'function' && CacheManager.needsUpdate()) {
        if (typeof CacheManager.clearAllCaches === 'function') {
          CacheManager.clearAllCaches().catch(() => {});
        }
      }
      if (CacheManager && typeof CacheManager.addCacheBustingHeaders === 'function') {
        CacheManager.addCacheBustingHeaders();
      }
    } catch (_) {}

    try {
      if (SEOManager && typeof SEOManager.forceRefresh === 'function') {
        SEOManager.forceRefresh();
      }
    } catch (_) {}

    if (!isDev && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      }).catch(() => {});
    }
  } catch (_) {}
};

const hideLoadingIndicator = () => {
  const li = document.getElementById('loading-indicator');
  if (li) li.style.display = 'none';
};

const renderEmergencyFallback = (rootElement: HTMLElement) => {
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: 'Inter', Arial, sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa;">
      <h1 style="color: #1f2937; margin-bottom: 16px;">StudentXchange</h1>
      <p style="color: #6b7280; margin-bottom: 24px;">There was an error loading the application.</p>
       <button id="emergency-reload-button" type="button" style="background:#2563eb;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-size:16px;font-weight:500;">Reload Page</button>
    </div>
  `;
  rootElement.querySelector('#emergency-reload-button')?.addEventListener('click', () => window.location.reload());
};

const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    );

    document.body.classList.add('react-loaded');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideLoadingIndicator();
      });
    });

    setTimeout(backgroundInit, 0);
  } catch (error) {
    try {
      const alreadyReloaded = sessionStorage.getItem('sx_auto_reloaded');
      if (!alreadyReloaded) {
        sessionStorage.setItem('sx_auto_reloaded', '1');
        window.location.reload();
      } else {
        renderEmergencyFallback(rootElement);
      }
    } catch (_) {
      renderEmergencyFallback(rootElement);
    }
  }
}
