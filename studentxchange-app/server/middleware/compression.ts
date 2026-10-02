import { Request, Response, NextFunction } from 'express';

// Gzip compression middleware for better performance
export function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Set compression headers
  res.setHeader('Vary', 'Accept-Encoding');
  
  // Cache static assets for better performance
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
  } else if (req.url.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
  }
  
  // Security headers for better performance
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
}