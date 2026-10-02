import { useEffect } from 'react';

export function useTrafficOptimization() {
  useEffect(() => {
    const optimizeImages = () => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.getAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        if (!img.getAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }
      });
    };

    const optimizeForConnection = () => {
      try {
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
            document.documentElement.style.setProperty('--image-quality', '0.7');
          }
        }
      } catch (_) {}
    };

    optimizeImages();
    optimizeForConnection();
  }, []);
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
