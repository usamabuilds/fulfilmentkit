import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { getAuthRuntimeConfig } from '../../config/env.validation';

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
  [key: string]: unknown;
};

type MiddlewareRequest = {
  originalUrl?: string;
  url?: string;
  headers?: {
    authorization?: unknown;
  };
  user?: unknown;
  auth?: unknown;
};

type SupportedAuthProvider = 'local' | 'supabase';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtAuthMiddleware.name);
  private readonly authConfig = getAuthRuntimeConfig(process.env);

  private deriveProviderFromClaims(claims: JwtPayload): SupportedAuthProvider | undefined {
    if (typeof claims.provider === 'string') {
      if (claims.provider === 'local' || claims.provider === 'supabase') {
        return claims.provider;
      }

      return undefined;
    }

    // Supabase access tokens commonly omit `provider`; infer explicitly.
    if (
      (typeof claims.iss === 'string' && claims.iss.includes('supabase')) ||
      claims.role === 'authenticated' ||
      claims.aud === 'authenticated'
    ) {
      return 'supabase';
    }

    // Local tokens should include an explicit provider claim.
    return undefined;
  }

  private extractExternalUserId(
    claims: JwtPayload,
    provider: SupportedAuthProvider,
  ): string | undefined {
    if (typeof claims.sub === 'string' && claims.sub.length > 0) {
      return claims.sub;
    }

    // Explicitly-supported legacy fallback for Supabase JWTs.
    if (provider === 'supabase' && typeof claims.user_id === 'string' && claims.user_id.length > 0) {
      return claims.user_id;
    }

    return undefined;
  }

  use(req: MiddlewareRequest, _res: unknown, next: (err?: unknown) => void) {
    const path = req?.originalUrl || req?.url;
    const authHeader = req?.headers?.authorization;

    try {
      if (!authHeader || typeof authHeader !== 'string') {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const [scheme, token] = authHeader.split(' ');

      if (scheme !== 'Bearer' || !token) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const decodedWithoutVerify = jwt.decode(token);
      const tokenIssuer =
        decodedWithoutVerify && typeof decodedWithoutVerify === 'object'
          ? decodedWithoutVerify.iss
          : undefined;

      const verificationTarget = this.resolveVerificationTarget(tokenIssuer);
      const decoded = jwt.verify(token, verificationTarget.secret) as JwtPayload;

      const providerFromClaims = this.deriveProviderFromClaims(decoded);
      const provider = providerFromClaims ?? verificationTarget.provider;

      // Never accept a token that declares a conflicting provider.
      if (providerFromClaims && providerFromClaims !== verificationTarget.provider) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      const externalUserId = this.extractExternalUserId(decoded, provider);

      if (!externalUserId) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      req.auth = {
        provider,
        externalUserId,
        email: decoded.email,
        tokenClaims: decoded,
      };

      req.user = {
        id: externalUserId,
        email: decoded.email,
        tokenClaims: decoded,
      };

      return next();
    } catch (err: unknown) {
      const error = err as { message?: string; name?: string };
      this.logger.warn('[JwtAuthMiddleware] VERIFY FAILED', {
        path,
        name: error?.name,
        message: error?.message || String(err),
      });

      req.user = undefined;
      req.auth = undefined;
      return next();
    }
  }

  private resolveVerificationTarget(tokenIssuer: unknown): {
    provider: SupportedAuthProvider;
    secret: string;
  } {
    if (this.authConfig.mode === 'local') {
      const localConfig = this.authConfig.local;

      if (!localConfig) {
        throw new Error('Local auth config is missing while AUTH_MODE=local.');
      }

      if (typeof tokenIssuer === 'string' && tokenIssuer !== localConfig.issuer) {
        throw new Error(
          `Unexpected JWT issuer for AUTH_MODE=local. Expected issuer ${localConfig.issuer}.`,
        );
      }

      return { provider: 'local', secret: localConfig.secret };
    }

    if (this.authConfig.mode === 'supabase') {
      const supabaseConfig = this.authConfig.supabase;

      if (!supabaseConfig) {
        throw new Error('Supabase auth config is missing while AUTH_MODE=supabase.');
      }

      if (tokenIssuer !== supabaseConfig.issuer) {
        throw new Error(
          `Unexpected JWT issuer for AUTH_MODE=supabase. Expected issuer ${supabaseConfig.issuer}.`,
        );
      }

      return { provider: 'supabase', secret: supabaseConfig.secret };
    }

    const localConfig = this.authConfig.local;
    if (tokenIssuer === localConfig?.issuer && localConfig) {
      return { provider: 'local', secret: localConfig.secret };
    }

    const supabaseConfig = this.authConfig.supabase;
    if (tokenIssuer === supabaseConfig?.issuer && supabaseConfig) {
      return { provider: 'supabase', secret: supabaseConfig.secret };
    }

    throw new Error(
      `Unsupported JWT issuer for AUTH_MODE=hybrid. Expected one of: ${this.authConfig.local?.issuer}, ${this.authConfig.supabase?.issuer}.`,
    );
  }
}
