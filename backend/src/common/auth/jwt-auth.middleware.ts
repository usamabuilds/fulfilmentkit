import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import jwt from 'jsonwebtoken';

type JwtPayload = {
  // Canonical identity claim for all providers.
  sub?: string;
  // Legacy Supabase claim used only as an explicit fallback.
  user_id?: string;
  provider?: string;
  email?: string;
  role?: string;
  iss?: string;
  aud?: string;
  [key: string]: any;
};

type SupportedAuthProvider = 'local' | 'supabase';

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

  private deriveProviderFromClaims(
    claims: JwtPayload,
  ): SupportedAuthProvider | undefined {
    if (typeof claims?.provider === 'string') {
      if (claims.provider === 'local' || claims.provider === 'supabase') {
        return claims.provider;
      }

      return undefined;
    }

    // Supabase access tokens commonly omit `provider`; infer explicitly.
    if (
      (typeof claims?.iss === 'string' && claims.iss.includes('supabase')) ||
      claims?.role === 'authenticated' ||
      claims?.aud === 'authenticated'
    ) {
      return 'supabase';
    }

    // Local tokens must include an explicit provider claim.
    return undefined;
  }

  private extractExternalUserId(
    claims: JwtPayload,
    provider: SupportedAuthProvider,
  ): string | undefined {
    if (typeof claims?.sub === 'string' && claims.sub.length > 0) {
      return claims.sub;
    }

    // Explicitly-supported legacy fallback for Supabase JWTs.
    if (
      provider === 'supabase' &&
      typeof claims?.user_id === 'string' &&
      claims.user_id.length > 0
    ) {
      return claims.user_id;
    }

    return undefined;
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

      const provider = this.deriveProviderFromClaims(decoded);

      if (!provider) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const externalUserId = this.extractExternalUserId(decoded, provider);

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
        provider,
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
