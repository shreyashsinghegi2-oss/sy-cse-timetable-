import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function redact(val: string | undefined): string {
  if (!val) return '—';
  if (val.length <= 6) return '***';
  return val.slice(0, 3) + '***' + val.slice(-3);
}

export function logSecurityEvent(
  event: string,
  req: Request,
  extra: Record<string, unknown> = {}
): void {
  const ip = getClientIp(req);
  const ts = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ua = (req.headers['user-agent'] || '').slice(0, 80);
  const userId = (req as any).session?.userId || (req as any).jwtUser?.uid || '—';

  console.warn(`[SECURITY] ${ts} | ${event} | ip=${ip} | ${method} ${path} | userId=${userId} | ua="${ua}"${
    Object.keys(extra).length ? ' | ' + Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' | ') : ''
  }`);
}

const AUTH_PATHS = new Set([
  '/api/login',
  '/api/register',
  '/api/auth/google',
  '/api/forgot-password',
  '/api/reset-password',
  '/api/direct-password-reset',
]);

const SENSITIVE_PATHS = new Set([
  '/api/admin',
  '/api/payu',
  '/api/create-payment-intent',
]);

export function securityAuditLogger(req: Request, res: Response, next: NextFunction): void {
  const origEnd = res.end.bind(res);

  (res as any).end = function (...args: any[]) {
    const status = res.statusCode;

    if (AUTH_PATHS.has(req.path) && (status === 401 || status === 403)) {
      logSecurityEvent('AUTH_FAIL', req, { status });
    }

    if (req.path.startsWith('/api/admin') && status !== 404) {
      const isOk = status < 400;
      if (!isOk) {
        logSecurityEvent('ADMIN_DENY', req, { status });
      } else if (isProduction) {
        logSecurityEvent('ADMIN_ACCESS', req, { status });
      }
    }

    if (status === 429) {
      logSecurityEvent('RATE_LIMITED', req, { path: req.path });
    }

    if (status === 403 && !AUTH_PATHS.has(req.path)) {
      logSecurityEvent('FORBIDDEN', req, { status, path: req.path });
    }

    return origEnd(...args);
  };

  next();
}

export function detectSuspiciousPatterns(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.headers['user-agent'] || '';

  const suspiciousUAs = [
    /sqlmap/i, /nikto/i, /nessus/i, /masscan/i, /zgrab/i,
    /havij/i, /burpsuite/i, /w3af/i, /acunetix/i, /openvas/i,
  ];

  if (suspiciousUAs.some(p => p.test(userAgent))) {
    logSecurityEvent('SCANNER_DETECTED', req, { ua: userAgent.slice(0, 60) });
    return res.status(403).json({ error: 'Access denied' }) as any;
  }

  const rawPath = req.path + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  const traversalPatterns = [/\.\.\//g, /\.\.%2F/gi, /%2e%2e/gi, /\.\.\\/, /;.*=/];

  if (traversalPatterns.some(p => p.test(rawPath))) {
    logSecurityEvent('PATH_TRAVERSAL', req, { path: rawPath.slice(0, 100) });
    return res.status(400).json({ error: 'Bad request' }) as any;
  }

  next();
}
