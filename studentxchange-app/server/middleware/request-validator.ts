import { Request, Response, NextFunction } from 'express';

export const LIMITS = {
  POST_CONTENT_MAX: 5000,
  COMMENT_MAX: 1000,
  USERNAME_MAX: 50,
  BIO_MAX: 500,
  PAGINATION_DEFAULT: 20,
  PAGINATION_MAX: 50,
  FILE_SIZE_MAX: 50 * 1024 * 1024,
  FILES_MAX: 5,
  TEAM_SIZE_MAX: 10,
};

export function validatePagination(req: Request, res: Response, next: NextFunction) {
  let limit = parseInt(req.query.limit as string) || LIMITS.PAGINATION_DEFAULT;
  let offset = parseInt(req.query.offset as string) || 0;
  
  limit = Math.min(Math.max(1, limit), LIMITS.PAGINATION_MAX);
  offset = Math.max(0, offset);
  
  (req as any).pagination = { limit, offset };
  next();
}

export function validateContentLength(maxLength: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const content = req.body.content || req.body.text || req.body.message;
    
    if (content && typeof content === 'string' && content.length > maxLength) {
      return res.status(400).json({
        error: 'Content too long',
        message: `Content must be ${maxLength} characters or less`,
        maxLength
      });
    }
    
    next();
  };
}

const STRING_FIELD_MAX = 50_000;

const SUSPICIOUS_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, label: 'script-tag' },
  { pattern: /<iframe[\s>]/gi, label: 'iframe' },
  { pattern: /<embed[\s>]/gi, label: 'embed' },
  { pattern: /<object[\s>]/gi, label: 'object' },
  { pattern: /<svg[^>]*on\w+\s*=/gi, label: 'svg-event' },
  { pattern: /<img[^>]*on\w+\s*=/gi, label: 'img-event' },
  { pattern: /javascript\s*:/gi, label: 'javascript-uri' },
  { pattern: /vbscript\s*:/gi, label: 'vbscript-uri' },
  { pattern: /data\s*:\s*text\/html/gi, label: 'data-uri-html' },
  { pattern: /on\w+\s*=\s*["'`]?[^"'`>]+["'`]?/gi, label: 'event-handler' },
  { pattern: /\bexpression\s*\(/gi, label: 'css-expression' },
];

function logSuspicious(req: Request, label: string, sample: string) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'unknown';
    const preview = sample.substring(0, 200).replace(/\s+/g, ' ');
    console.warn(`[SECURITY] Suspicious ${label} pattern blocked. IP: ${ip} Path: ${req.method} ${req.path} Sample: ${preview}`);
  } catch (_) {}
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  let suspiciousCount = 0;
  const seen: Record<string, number> = {};

  function sanitizeString(str: string): string {
    if (str.length > STRING_FIELD_MAX) {
      str = str.substring(0, STRING_FIELD_MAX);
    }
    let cleaned = str.replace(/\u0000/g, '');
    // Repeat each pattern until stable to prevent nested-payload bypass
    // (e.g. "<scr<script>ipt>" → "<script>" → "")
    for (const { pattern, label } of SUSPICIOUS_PATTERNS) {
      let prev: string;
      let iter = 0;
      do {
        prev = cleaned;
        if (pattern.test(cleaned)) {
          seen[label] = (seen[label] || 0) + 1;
          suspiciousCount++;
          cleaned = cleaned.replace(pattern, '');
        } else {
          break;
        }
        iter++;
      } while (cleaned !== prev && iter < 10);
    }
    return cleaned.trim();
  }

  function sanitize(obj: any, depth = 0): any {
    if (depth > 20) {
      return null;
    }
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitize(item, depth + 1));
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        if (typeof key !== 'string') continue;
        if (key.startsWith('$')) {
          seen['nosql-operator'] = (seen['nosql-operator'] || 0) + 1;
          suspiciousCount++;
          continue;
        }
        if (key.includes('.') && !/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(key)) {
          seen['dotted-key'] = (seen['dotted-key'] || 0) + 1;
          suspiciousCount++;
          continue;
        }
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          seen['proto-pollution'] = (seen['proto-pollution'] || 0) + 1;
          suspiciousCount++;
          continue;
        }
        result[key] = sanitize(obj[key], depth + 1);
      }
      return result;
    }
    return obj;
  }

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    try {
      const sanitizedQuery = sanitize(req.query);
      Object.keys(req.query).forEach((k) => {
        if (k.startsWith('$') || (k.includes('.') && !/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(k))) {
          delete (req.query as any)[k];
        }
      });
      Object.assign(req.query, sanitizedQuery);
    } catch (_) {}
  }

  if (suspiciousCount > 0) {
    const labels = Object.entries(seen).map(([l, c]) => `${l}:${c}`).join(',');
    logSuspicious(req, labels, JSON.stringify(req.body).substring(0, 200));
  }

  next();
}

export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  const files = req.files as Express.Multer.File[] | undefined;
  const singleFile = (req as any).file as Express.Multer.File | undefined;
  
  if (singleFile) {
    if (singleFile.size > LIMITS.FILE_SIZE_MAX) {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${LIMITS.FILE_SIZE_MAX / (1024 * 1024)}MB`,
        maxSize: LIMITS.FILE_SIZE_MAX
      });
    }
  }
  
  if (files) {
    if (files.length > LIMITS.FILES_MAX) {
      return res.status(400).json({
        error: 'Too many files',
        message: `Maximum ${LIMITS.FILES_MAX} files allowed`,
        maxFiles: LIMITS.FILES_MAX
      });
    }
    
    for (const file of files) {
      if (file.size > LIMITS.FILE_SIZE_MAX) {
        return res.status(400).json({
          error: 'File too large',
          message: `Maximum file size is ${LIMITS.FILE_SIZE_MAX / (1024 * 1024)}MB`,
          maxSize: LIMITS.FILE_SIZE_MAX
        });
      }
    }
  }
  
  next();
}
