// Cache management utilities for ensuring fresh data
export class CacheManager {
  private static instance: CacheManager;
  private version: string;

  constructor() {
    this.version = `v${Date.now()}`;
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Force cache invalidation for critical updates
  invalidateAll() {
    // Clear React Query cache
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  // Add cache-busting parameter to requests
  addCacheBuster(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}_t=${Date.now()}`;
  }

  // Clear browser caches
  clearBrowserCache() {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage cache items
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_') || key.startsWith('query_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const cacheManager = CacheManager.getInstance();