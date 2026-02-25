import { Injectable, NestMiddleware } from '@nestjs/common';
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
  use(req: any, _res: any, next: (err?: any) => void) {
    const path = req?.originalUrl || req?.url;

    const authHeader = req?.headers?.authorization;

    console.log('[JwtAuthMiddleware] HIT', {
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

      console.log('[JwtAuthMiddleware] PARSE', {
        path,
        scheme,
        tokenLen: token ? token.length : 0,
      });

      if (scheme !== 'Bearer' || !token) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const secretFrom =
        process.env.SUPABASE_JWT_SECRET
          ? 'SUPABASE_JWT_SECRET'
          : process.env.JWT_SECRET
            ? 'JWT_SECRET'
            : process.env.NODE_ENV !== 'production'
              ? 'dev-secret'
              : 'none';

      const secret =
        process.env.SUPABASE_JWT_SECRET ||
        process.env.JWT_SECRET ||
        (process.env.NODE_ENV !== 'production' ? 'dev-secret' : undefined);

      console.log('[JwtAuthMiddleware] SECRET', { path, secretFrom });

      if (!secret) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const decoded = jwt.verify(token, secret) as JwtPayload;

      const externalUserId = decoded?.sub || decoded?.user_id;

      console.log('[JwtAuthMiddleware] VERIFIED', {
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
      console.log('[JwtAuthMiddleware] VERIFY FAILED', {
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
