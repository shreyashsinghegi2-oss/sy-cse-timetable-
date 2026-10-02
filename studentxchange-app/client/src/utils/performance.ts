// Performance optimization utilities

export const requestIdleCallback = (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  // Fallback for browsers without requestIdleCallback
  return setTimeout(() => callback({ 
    didTimeout: false, 
    timeRemaining: () => 50 
  }), 1);
};

export const cancelIdleCallback = (id: number) => {
  if ('cancelIdleCallback' in window) {
    return window.cancelIdleCallback(id);
  }
  return clearTimeout(id);
};

// Preload images when idle
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch DOM updates
export const batchDOMUpdates = (callback: () => void) => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      callback();
      resolve(void 0);
    });
  });
};

// Memory cleanup utilities
export const cleanupUnusedImages = () => {
  const images = document.querySelectorAll('img[data-cleanup="true"]');
  images.forEach(img => {
    if (!img.isConnected) {
      img.remove();
    }
  });
};

// Throttle scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
};