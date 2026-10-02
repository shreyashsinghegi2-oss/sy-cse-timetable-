// SEO utility functions for dynamic metadata
export class SEOManager {
  private static currentVersion = "4.0-2025-01-18";
  
  static updateTitle(title: string) {
    document.title = `${title} | StudentXchange`;
  }
  
  static updateDescription(description: string) {
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
  }
  
  static updateKeywords(keywords: string) {
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', keywords);
    }
  }
  
  static updateOpenGraph(data: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
  }) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    
    if (data.title && ogTitle) {
      ogTitle.setAttribute('content', data.title);
    }
    if (data.description && ogDescription) {
      ogDescription.setAttribute('content', data.description);
    }
    if (data.image && ogImage) {
      ogImage.setAttribute('content', data.image);
    }
    if (data.url && ogUrl) {
      ogUrl.setAttribute('content', data.url);
    }
  }
  
  static addStructuredData(data: any) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
  
  static addProductStructuredData(product: any) {
    const productSchema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.title,
      "description": product.description,
      "image": product.images?.[0] || "",
      "brand": {
        "@type": "Brand",
        "name": "StudentXchange"
      },
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "StudentXchange"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.rating || 4.5,
        "reviewCount": Math.floor(Math.random() * 50) + 10
      }
    };
    
    this.addStructuredData(productSchema);
  }
  
  static getVersion() {
    return this.currentVersion;
  }
  
  static forceRefresh() {
    const timestamp = new Date().getTime();
    const versionMeta = document.querySelector('meta[name="version"]');
    if (versionMeta) {
      versionMeta.setAttribute('content', `${this.currentVersion}-${timestamp}`);
    }
  }
}

// Enhanced cache management with version control
export class CacheManager {
  private static readonly CACHE_VERSION = "4.0-2025-01-18";
  private static readonly CACHE_KEYS = [
    'studentxchange-v4',
    'studentxchange-assets',
    'studentxchange-api'
  ];
  
  static needsUpdate(): boolean {
    const lastVersion = localStorage.getItem('app-version');
    return lastVersion !== this.CACHE_VERSION;
  }
  
  static async clearAllCaches(): Promise<void> {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }
      
      // Clear localStorage (preserve non-sensitive UI state only)
      const userDataToPreserve = {
        onboardingCompleted: localStorage.getItem('onboardingCompleted')
      };
      
      localStorage.clear();
      
      // Restore user data
      Object.entries(userDataToPreserve).forEach(([key, value]) => {
        if (value) localStorage.setItem(key, value);
      });
      
      // Set new version
      localStorage.setItem('app-version', this.CACHE_VERSION);
    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }
  
  static async forceUpdate(): Promise<void> {
    await this.clearAllCaches();
    
    // Add cache busting headers
    const timestamp = Date.now();
    const metaRefresh = document.createElement('meta');
    metaRefresh.httpEquiv = 'refresh';
    metaRefresh.content = `0;url=${window.location.href}?v=${timestamp}`;
    document.head.appendChild(metaRefresh);
    
    // Force reload after brief delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
  
  static addCacheBustingHeaders(): void {
    // Service workers are registered through navigator.serviceWorker. Preloading
    // sw.js as a normal script does not help registration and creates a browser
    // warning because the resource is intentionally never executed by the page.
  }
}

export default SEOManager;