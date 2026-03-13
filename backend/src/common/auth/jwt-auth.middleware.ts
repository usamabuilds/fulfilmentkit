import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AuthRuntimeConfig, getAuthRuntimeConfig } from '../../config/env.validation';

type JwtPayload = {
  sub?: string;
  user_id?: string;
  provider?: string;
  email?: string;
  role?: string;
  iss?: string;
  aud?: string;
  [key: string]: unknown;
};

type SupportedAuthProvider = 'local' | 'supabase';

type MiddlewareRequest = {
  headers: {
    authorization?: string;
  };
  auth?: {
    provider: SupportedAuthProvider;
    externalUserId: string;
    email?: string;
    tokenClaims: JwtPayload;
  };
  user?: {
    id: string;
    email?: string;
    tokenClaims: JwtPayload;
  };
};

type MiddlewareResponse = Record<string, never>;
type MiddlewareNext = () => void;

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtAuthMiddleware.name);
  private readonly authConfig: AuthRuntimeConfig;

  constructor() {
    this.authConfig = getAuthRuntimeConfig(process.env);
  }

  private deriveProviderFromClaims(claims: JwtPayload): SupportedAuthProvider | undefined {
    if (claims.provider === 'local' || claims.provider === 'supabase') {
      return claims.provider;
    }

    if (
      (typeof claims.iss === 'string' && claims.iss.includes('supabase')) ||
      claims.role === 'authenticated' ||
      claims.aud === 'authenticated'
    ) {
      return 'supabase';
    }

    return undefined;
  }

  private extractExternalUserId(
    claims: JwtPayload,
    provider: SupportedAuthProvider,
  ): string | undefined {
    if (typeof claims.sub === 'string' && claims.sub.length > 0) {
      return claims.sub;
    }

    if (provider === 'supabase' && typeof claims.user_id === 'string' && claims.user_id.length > 0) {
      return claims.user_id;
    }

    return undefined;
  }

  private clearAuth(req: MiddlewareRequest, next: MiddlewareNext): void {
    req.user = undefined;
    req.auth = undefined;
    next();
  }

  use(req: MiddlewareRequest, _res: MiddlewareResponse, next: MiddlewareNext): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      this.clearAuth(req, next);
      return;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      this.clearAuth(req, next);
      return;
    }

    const decodedToken = jwt.decode(token);
    const unverifiedClaims: JwtPayload | undefined =
      decodedToken && typeof decodedToken === 'object' ? (decodedToken as JwtPayload) : undefined;
    const tokenIssuer = typeof unverifiedClaims?.iss === 'string' ? unverifiedClaims.iss : undefined;

    let verificationTarget:
      | { provider: SupportedAuthProvider; secret: string; issuer: string }
      | undefined;

    if (this.authConfig.mode === 'local') {
      if (tokenIssuer && tokenIssuer !== this.authConfig.local?.issuer) {
        this.clearAuth(req, next);
        return;
      }

      verificationTarget = {
        provider: 'local',
        secret: this.authConfig.local!.secret,
        issuer: this.authConfig.local!.issuer,
      };
    } else if (this.authConfig.mode === 'supabase') {
      if (!tokenIssuer || tokenIssuer !== this.authConfig.supabase?.issuer) {
        this.clearAuth(req, next);
        return;
      }

      verificationTarget = {
        provider: 'supabase',
        secret: this.authConfig.supabase!.secret,
        issuer: this.authConfig.supabase!.issuer,
      };
    } else {
      const local = this.authConfig.local;
      const supabase = this.authConfig.supabase;

      if (local && tokenIssuer === local.issuer) {
        verificationTarget = {
          provider: 'local',
          secret: local.secret,
          issuer: local.issuer,
        };
      } else if (supabase && tokenIssuer === supabase.issuer) {
        verificationTarget = {
          provider: 'supabase',
          secret: supabase.secret,
          issuer: supabase.issuer,
        };
      } else {
        this.clearAuth(req, next);
        return;
      }
    }

    try {
      const verified = jwt.verify(token, verificationTarget.secret) as jwt.JwtPayload | string;
      if (!verified || typeof verified !== 'object') {
        this.clearAuth(req, next);
        return;
      }

      const claims = verified as JwtPayload;
      const providerFromClaims = this.deriveProviderFromClaims(claims);

      if (providerFromClaims && providerFromClaims !== verificationTarget.provider) {
        this.clearAuth(req, next);
        return;
      }

      const provider = providerFromClaims ?? verificationTarget.provider;
      const externalUserId = this.extractExternalUserId(claims, provider);

      if (!externalUserId) {
        this.clearAuth(req, next);
        return;
      }

      this.logger.log('[JwtAuthMiddleware] VERIFIED', {
        provider: verificationTarget.provider,
        verificationIssuer: verificationTarget.issuer,
        hasProviderClaim: typeof claims.provider === 'string',
        hasSub: typeof claims.sub === 'string',
        hasUserId: typeof claims.user_id === 'string',
      });

      req.auth = {
        provider,
        externalUserId,
        email: typeof claims.email === 'string' ? claims.email : undefined,
        tokenClaims: claims,
      };

      req.user = {
        id: externalUserId,
        email: typeof claims.email === 'string' ? claims.email : undefined,
        tokenClaims: claims,
      };

      next();
    } catch (error: unknown) {
      const err = error as { message?: string; name?: string };
      this.logger.warn('[JwtAuthMiddleware] VERIFY FAILED', {
        name: err.name,
        message: err.message ?? String(error),
      });

      this.clearAuth(req, next);
    }
  }
}
