import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SessionRefreshDto } from './dto/session-refresh.dto';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh')
  async refresh(@Body() body: SessionRefreshDto) {
    return this.authService.refreshSession(body.sessionValue);
  }

  @Post('logout')
  async logout(@Body() body: SessionRefreshDto) {
    return this.authService.logout(body.sessionValue);
  }
}
