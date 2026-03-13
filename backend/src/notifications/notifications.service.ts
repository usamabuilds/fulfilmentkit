import { Injectable, Logger } from '@nestjs/common';

export class VerificationDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerificationDeliveryError';
  }
}

type VerificationProvider =
  | {
      kind: 'resend';
      apiKey: string;
      fromEmail: string;
    }
  | {
      kind: 'dev-fallback';
    };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly provider: VerificationProvider;

  constructor() {
    this.provider = this.resolveProvider(process.env);
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (this.provider.kind === 'resend') {
      await this.sendWithResend(email, code, this.provider);
      return;
    }

    const maskedCode = this.maskCode(code);
    this.logger.log(`DEV verification code email=${email} code=${maskedCode}`);
  }

  private resolveProvider(
    env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  ): VerificationProvider {
    const apiKey = env.RESEND_API_KEY?.trim();
    const fromEmail = env.VERIFICATION_EMAIL_FROM?.trim();

    if (apiKey && fromEmail) {
      return {
        kind: 'resend',
        apiKey,
        fromEmail,
      };
    }

    if (env.NODE_ENV === 'production') {
      throw new VerificationDeliveryError(
        'Verification delivery provider is not configured in production',
      );
    }

    return { kind: 'dev-fallback' };
  }

  private async sendWithResend(
    email: string,
    code: string,
    provider: { kind: 'resend'; apiKey: string; fromEmail: string },
  ): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: provider.fromEmail,
        to: [email],
        subject: 'Your verification code',
        text: `Your verification code is ${code}`,
      }),
    });

    if (!response.ok) {
      throw new VerificationDeliveryError(
        `Verification email provider rejected delivery with status ${response.status}`,
      );
    }
  }

  private maskCode(code: string): string {
    if (code.length <= 2) {
      return '*'.repeat(code.length);
    }

    return `${code.slice(0, 1)}${'*'.repeat(Math.max(0, code.length - 2))}${code.slice(-1)}`;
  }
}
