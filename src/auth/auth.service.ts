import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import axios from 'axios';
import { GITHUB_OAUTH_SCOPES } from 'src/common/const';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Env } from 'src/common/types/Env';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService<Env, true>,
    private prismaService: PrismaService,
  ) {}

  redirectToGitHubAuthorizePage() {
    const clientId = this.configService.get('GITHUB_CLIENT_ID');

    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', GITHUB_OAUTH_SCOPES);

    return {
      url: url.toString(),
      statusCode: 302,
    };
  }

  redirectToGoogleAuthorizePage() {
    //
  }

  async signInWithGitHub(code: string) {
    const clientId = this.configService.get('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get('GITHUB_CLIENT_SECRET');

    const url = new URL('https://github.com/login/oauth/access_token');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('code', code);
    url.searchParams.set('scope', GITHUB_OAUTH_SCOPES);

    const accessTokenResponse = await axios.post<string>(url.toString());
    const data: Record<string, string> = {};
    accessTokenResponse.data.split('&').map((keyValue) => {
      const [key, value] = keyValue.split('=');
      data[key] = value;
    });
    const accessToken = data['access_token'];
    const userResponse = await axios.get<{
      login: string;
      id: string;
      avatar_url: string;
      name: string;
    }>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const user = await this.prismaService.user.findUnique({
      where: {
        userId: userResponse.data.id.toString(),
      },
    });
    if (user !== null) {
      return {
        user,
        accessToken,
      };
    }

    const emailResponse = await axios.get<
      {
        email: string;
        primary: boolean;
      }[]
    >('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const email = emailResponse.data.find((r) => r.primary)?.email;
    if (!email) {
      throw new Error("unexpected server error: primary email doesn't exists");
    }

    const createdUser = await this.prismaService.user.create({
      data: {
        email,
        userId: userResponse.data.id.toString(),
        name: userResponse.data.name,
        imageUrl: userResponse.data.avatar_url,
        displayId: userResponse.data.login,
        authProvider: AuthProvider.github,
      },
    });

    return {
      user: createdUser,
      accessToken,
    };
  }

  async getAccessTokenFromGoogle() {
    //
  }
}
