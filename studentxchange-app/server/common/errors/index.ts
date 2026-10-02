/**
 * server/common/errors/index.ts
 * Typed HTTP error classes for consistent error handling across all routes.
 *
 * Usage:
 *   import { NotFoundError, ForbiddenError } from '../common/errors';
 *   throw new NotFoundError('Product not found');
 *
 * The express error handler in server/index.ts or middleware can then catch
 * these and respond with the correct HTTP status code automatically.
 */

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", code?: string) {
    super(400, message, code ?? "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication required", code?: string) {
    super(401, message, code ?? "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Access denied", code?: string) {
    super(403, message, code ?? "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource not found", code?: string) {
    super(404, message, code ?? "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Resource conflict", code?: string) {
    super(409, message, code ?? "CONFLICT");
    this.name = "ConflictError";
  }
}

export class UnprocessableError extends HttpError {
  constructor(message = "Validation failed", code?: string) {
    super(422, message, code ?? "UNPROCESSABLE");
    this.name = "UnprocessableError";
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = "Too many requests", code?: string) {
    super(429, message, code ?? "RATE_LIMITED");
    this.name = "TooManyRequestsError";
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal server error", code?: string) {
    super(500, message, code ?? "INTERNAL_ERROR");
    this.name = "InternalServerError";
  }
}

/**
 * Express error handler middleware.
 * Register last in server/index.ts:  app.use(httpErrorHandler);
 */
import type { Request, Response, NextFunction } from "express";

export function httpErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }
  // Unknown / unhandled error — log it but don't leak details to clients
  console.error("[UnhandledError]", err);
  res.status(500).json({ error: "An unexpected error occurred" });
}
