import { Injectable, Logger } from '@nestjs/common';

const RESEND_API_URL = 'https://api.resend.com/emails';

export class VerificationDeliveryError extends Error {
  constructor() {
    super('Unable to deliver verification code');
    this.name = 'VerificationDeliveryError';
  }
}

type DeliveryProvider =
  | {
      type: 'resend';
      apiKey: string;
      from: string;
    }
  | {
      type: 'fallback';
    };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly provider: DeliveryProvider;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.VERIFICATION_EMAIL_FROM?.trim();
    const isProduction = process.env.NODE_ENV === 'production';

    if (apiKey && from) {
      this.provider = {
        type: 'resend',
        apiKey,
        from,
      };
      return;
    }

    if (isProduction) {
      throw new Error(
        'Verification delivery provider is not configured. Set RESEND_API_KEY and VERIFICATION_EMAIL_FROM.',
      );
    }

    this.provider = { type: 'fallback' };
    this.logger.warn(
      'Verification delivery provider not configured. Falling back to development logger delivery.',
    );
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (this.provider.type === 'fallback') {
      this.logger.log(
        `Verification code generated for ${email} (masked code: ${this.maskCode(code)})`,
      );
      return;
    }

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.provider.from,
          to: [email],
          subject: 'Your verification code',
          text: `Your verification code is ${code}. It expires in 15 minutes.`,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Verification delivery provider responded with HTTP ${response.status}`);
        throw new VerificationDeliveryError();
      }
    } catch (error) {
      if (error instanceof VerificationDeliveryError) {
        throw error;
      }

      this.logger.error('Verification delivery request failed');
      throw new VerificationDeliveryError();
    }
  }

  private maskCode(code: string): string {
    if (code.length <= 2) {
      return '*'.repeat(code.length);
    }

    return `${'*'.repeat(code.length - 2)}${code.slice(-2)}`;
  }
}
