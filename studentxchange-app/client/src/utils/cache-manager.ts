// Automated Cache Management System
export class CacheManager {
  private static readonly CACHE_VERSION = 'v3.2-2025-01-17-mobile';
  private static readonly VERSION_KEY = 'cacheVersion';
  private static readonly ESSENTIAL_KEYS = ['onboardingCompleted', 'hasVisited'];

  // Check if cache clearing is needed
  static needsCacheClearing(): boolean {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    return storedVersion !== this.CACHE_VERSION;
  }

  // Clear all caches automatically
  static async clearAllCaches(): Promise<void> {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Backup essential data
      const backup: Record<string, string> = {};
      this.ESSENTIAL_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) backup[key] = value;
      });

      // Clear localStorage
      localStorage.clear();

      // Restore essential data
      Object.entries(backup).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });

      // Set new version
      localStorage.setItem(this.VERSION_KEY, this.CACHE_VERSION);

    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }

  // Force page reload if cache was cleared (safe for preview)
  static forceReloadIfNeeded(): void {
    // Skip reload in preview/iframe environments
    if (window.self !== window.top || window.location.hostname === 'localhost') {
      return;
    }
    
    const timestamp = Date.now();
    const lastReload = localStorage.getItem('lastCacheReload');
    
    if (!lastReload || timestamp - parseInt(lastReload) > 60000) { // 1 minute cooldown
      localStorage.setItem('lastCacheReload', timestamp.toString());
      window.location.reload();
    }
  }

  // Add cache-busting parameters to URLs
  static addCacheBusting(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${this.CACHE_VERSION}&t=${Date.now()}`;
  }

  // Prevent browser caching via meta tags
  static preventBrowserCaching(): void {
    const metaTags = [
      { httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate' },
      { httpEquiv: 'Pragma', content: 'no-cache' },
      { httpEquiv: 'Expires', content: '0' }
    ];

    metaTags.forEach(({ httpEquiv, content }) => {
      const meta = document.createElement('meta');
      meta.httpEquiv = httpEquiv;
      meta.content = content;
      document.head.appendChild(meta);
    });
  }
}