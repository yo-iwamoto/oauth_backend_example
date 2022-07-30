import { AuthService } from './auth.service';
import { Controller, Get, Query, Redirect, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/github')
  @Redirect()
  redirectToGitHubAuthorizePage() {
    return this.authService.redirectToGitHubAuthorizePage();
  }

  @Get('/github/callback')
  async handleGitHubCallback(
    @Query('code') code: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { user, accessToken } = await this.authService.signInWithGitHub(code);
    reply.setCookie('github_access_token', accessToken, {
      httpOnly: true,
      secure: true,
    });
    return user;
  }
}
