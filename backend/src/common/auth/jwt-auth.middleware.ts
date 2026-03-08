import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import jwt from 'jsonwebtoken';

type JwtPayload = {
  sub?: string;
  user_id?: string;
  email?: string;
  role?: string;
  [key: string]: any;
};

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtAuthMiddleware.name);
  private readonly jwtSecret: string;

  constructor() {
    const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'Missing JWT secret: set SUPABASE_JWT_SECRET or JWT_SECRET before starting the application.',
      );
    }

    this.jwtSecret = secret;
  }

  use(req: any, _res: any, next: (err?: any) => void) {
    const path = req?.originalUrl || req?.url;

    const authHeader = req?.headers?.authorization;

    this.logger.log('[JwtAuthMiddleware] HIT', {
      path,
      hasAuthHeader: !!authHeader,
      authHeaderType: typeof authHeader,
    });

    try {
      if (!authHeader || typeof authHeader !== 'string') {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const [scheme, token] = authHeader.split(' ');

      this.logger.log('[JwtAuthMiddleware] PARSE', {
        path,
        scheme,
        tokenLen: token ? token.length : 0,
      });

      if (scheme !== 'Bearer' || !token) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const secretFrom = process.env.SUPABASE_JWT_SECRET
        ? 'SUPABASE_JWT_SECRET'
        : 'JWT_SECRET';

      const secret = this.jwtSecret;

      this.logger.log('[JwtAuthMiddleware] SECRET', { path, secretFrom });

      const decoded = jwt.verify(token, secret) as JwtPayload;

      const externalUserId = decoded?.sub || decoded?.user_id;

      this.logger.log('[JwtAuthMiddleware] VERIFIED', {
        path,
        hasSub: !!decoded?.sub,
        hasUserId: !!decoded?.user_id,
        externalUserId,
        hasEmail: !!decoded?.email,
      });

      if (!externalUserId) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      req.auth = {
        provider: 'supabase',
        externalUserId,
        email: decoded?.email,
        tokenClaims: decoded,
      };

      req.user = {
        id: externalUserId,
        email: decoded?.email,
        tokenClaims: decoded,
      };

      return next();
    } catch (err: any) {
      const msg = err?.message || String(err);
      this.logger.warn('[JwtAuthMiddleware] VERIFY FAILED', {
        path,
        name: err?.name,
        message: msg,
      });

      req.user = undefined;
      req.auth = undefined;
      return next();
    }
  }
}
