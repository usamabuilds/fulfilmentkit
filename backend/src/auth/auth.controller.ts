import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { apiResponse } from '../common/utils/api-response';
import { AuthService } from './auth.service';

const AuthBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const RegisterBodySchema = AuthBodySchema.extend({
  plan: z.string().trim().min(1).max(64).optional(),
});

const VerifyEmailBodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});

const ResendCodeBodySchema = z.object({
  email: z.string().email(),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = RegisterBodySchema.parse(body);
    const result = await this.authService.register(parsed);
    return apiResponse(result);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = AuthBodySchema.parse(body);
    const result = await this.authService.login(parsed);
    return apiResponse(result);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: unknown) {
    const parsed = VerifyEmailBodySchema.parse(body);
    const result = await this.authService.verifyEmail(parsed);
    return apiResponse(result);
  }

  @Post('resend-code')
  async resendCode(@Body() body: unknown) {
    const parsed = ResendCodeBodySchema.parse(body);
    const result = await this.authService.resendVerificationCode(parsed);
    return apiResponse(result);
  }
}
