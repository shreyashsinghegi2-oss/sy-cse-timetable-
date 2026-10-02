import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
  etag: string;
}

const cache = new Map<string, CacheEntry>();

const CACHE_DURATIONS = {
  short: 30 * 1000,
  medium: 2 * 60 * 1000,
  long: 10 * 60 * 1000,
  static: 60 * 60 * 1000,
};

function generateETag(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

function cleanupExpiredCache() {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_DURATIONS.static) {
      cache.delete(key);
    }
  }
}

setInterval(cleanupExpiredCache, 5 * 60 * 1000);

export function createCacheMiddleware(
  duration: keyof typeof CACHE_DURATIONS = 'short',
  keyGenerator?: (req: Request) => string
) {
  const ttl = CACHE_DURATIONS[duration];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = keyGenerator 
      ? keyGenerator(req)
      : `${req.originalUrl}:${(req as any).user?.uid || 'anon'}`;
    
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < ttl) {
      const clientEtag = req.headers['if-none-match'];
      if (clientEtag === cached.etag) {
        return res.status(304).end();
      }
      
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('ETag', cached.etag);
      res.setHeader('Cache-Control', `private, max-age=${Math.floor(ttl / 1000)}`);
      return res.json(cached.data);
    }
    
    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const etag = generateETag(data);
        cache.set(cacheKey, {
          data,
          timestamp: now,
          etag
        });
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('ETag', etag);
      }
      return originalJson(data);
    };
    
    next();
  };
}

export function invalidateCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export const cacheMiddleware = {
  short: createCacheMiddleware('short'),
  medium: createCacheMiddleware('medium'),
  long: createCacheMiddleware('long'),
  static: createCacheMiddleware('static'),
};
