import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Always log — critical for monitoring tomorrow's launch. In production we
  // include method+path+status so we can grep the deployment logs in one place.
  const status = (err as any).statusCode || ((err as any).status as number) || 500;
  const logLevel = status >= 500 ? 'ERROR' : 'WARN';
  console.error(
    `[${logLevel}] ${new Date().toISOString()} ${req.method} ${req.path} → ${status} | ${err.name}: ${err.message}`,
    isProduction ? '' : (err.stack || '')
  );

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }
  
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: isProduction ? 'Invalid input data' : err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please log in to continue'
    });
  }
  
  if ((err as any).code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Please try again later'
    });
  }
  
  res.status(500).json({
    error: 'Something went wrong',
    message: 'We encountered an unexpected error. Please try again.'
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    message: `Cannot ${req.method} ${req.path}`
  });
}
