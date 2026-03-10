import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { apiResponse } from '../common/utils/api-response';
import { AuthService } from './auth.service';

const AuthBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = AuthBodySchema.parse(body);
    const result = await this.authService.register(parsed);
    return apiResponse(result);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const parsed = AuthBodySchema.parse(body);
    const result = await this.authService.login(parsed);
    return apiResponse(result);
  }
}
