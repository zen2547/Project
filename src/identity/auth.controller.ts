import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { registerSchema, type RegisterDto } from './dto/register.dto.js';
import { loginSchema, type LoginDto } from './dto/login.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST defaults to 201 Created in Nest.
  @Public()
  @Post('register')
  register(@Body({ schema: registerSchema }) dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // Logging in creates nothing, so 200 instead of the POST default 201.
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body({ schema: loginSchema }) dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  me(@CurrentUser('id') userId: number) {
    return this.auth.getProfile(userId);
  }
}
