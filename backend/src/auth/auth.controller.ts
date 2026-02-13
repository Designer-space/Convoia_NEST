import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService
  ) {}

  @Post('register')
  register(
    @Body('name') name: string,
    @Body('username') username: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.registerUser({ name, username, email, password });
  }
  @Post('login')
  login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }
}
