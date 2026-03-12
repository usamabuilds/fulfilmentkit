import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { getAuthRuntimeConfig } from '../../config/env.validation';

type JwtPayload = {
  sub?: string;
  user_id?: string;
  email?: string;
  role?: string;
  iss?: string;
  provider?: string;
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

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtAuthMiddleware.name);
  private readonly authConfig = getAuthRuntimeConfig(process.env);

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
      const externalUserId = decoded?.sub || decoded?.user_id;

      if (!externalUserId) {
        req.user = undefined;
        req.auth = undefined;
        return next();
      }

      req.auth = {
        provider: verificationTarget.provider,
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
    provider: 'local' | 'supabase';
    secret: string;
  } {
    if (this.authConfig.mode === 'local') {
      return { provider: 'local', secret: this.authConfig.local!.secret };
    }

    if (this.authConfig.mode === 'supabase') {
      return { provider: 'supabase', secret: this.authConfig.supabase!.secret };
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
