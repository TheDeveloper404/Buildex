import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = '_csrf';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Skip CSRF for safe methods
    if (SAFE_METHODS.includes(req.method)) {
      // Generate and set CSRF token if not present
      if (!req.cookies[CSRF_COOKIE]) {
        const token = randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE, token, {
          httpOnly: false,
          secure: process.env.COOKIE_SECURE === 'true',
          sameSite: 'lax',
          path: '/',
        });
      }
      return next();
    }

    const fullPath = req.originalUrl || req.path;

    // Skip CSRF for public supplier endpoints (token-based auth)
    if (fullPath.includes('/supplier/')) {
      return next();
    }

    // Skip CSRF for dev-login in development
    if (
      fullPath.includes('/auth/dev-login') &&
      process.env.DEV_LOGIN_ENABLED === 'true'
    ) {
      return next();
    }

    // Validate CSRF token for state-changing requests
    const cookieToken = req.cookies[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER] as string;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }
}
