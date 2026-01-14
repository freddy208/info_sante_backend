/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
  Ip,
  Res,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import express_1 from 'express'; // Import Express Response
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import express from 'express';
import express_2 from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ... (Code existant pour getCurrentUser, logout...) ...
  // =====================================
  // 👤 GET CURRENT USER
  // =====================================

  @Get('me')
  @UseGuards(JwtAuthGuard) // Route protégée - JWT requis
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Obtenir l'utilisateur connecté",
    description: `
      Récupère les informations de l'utilisateur actuellement connecté.
      
      **Authentification requise :**
      - Header: Authorization: Bearer <access_token>
      
      **Utilisation :**
      - Vérifier si l'utilisateur est toujours connecté
      - Récupérer les infos du profil
      - Vérifier le statut du compte
    `,
  })
  @ApiResponse({
    status: 200,
    description: "Informations de l'utilisateur",
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+237 6 XX XX XX XX',
          avatar: 'https://cloudinary.com/...',
          city: 'Douala',
          region: 'Littoral',
          status: 'ACTIVE',
          isEmailVerified: false,
          isPhoneVerified: false,
          createdAt: '2025-11-24T12:00:00.000Z',
          lastLoginAt: '2025-11-24T12:00:00.000Z',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalide ou expiré',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token invalide ou expiré',
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/auth/me',
        method: 'GET',
      },
    },
  })
  async getCurrentUser(@CurrentUser() user: any) {
    // L'utilisateur est déjà récupéré par le JwtStrategy
    // On retourne juste ses informations
    return user;
  }

  // =====================================
  // 📝 INSCRIPTION (MODIFIÉE POUR COOKIE)
  // =====================================
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @Res({ passthrough: true }) res: express_1.Response,
  ) {
    const result = await this.authService.register(registerDto);

    // ✅ Définir le HttpOnly Cookie pour le Refresh Token
    this.setRefreshTokenCookie(res, result.refreshToken);

    // ✅ CHANGEMENT : Retour direct sans wrapper "data"
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  // =====================================
  // 🔐 CONNEXION (MODIFIÉE POUR COOKIE)
  // =====================================
  // =====================================
  // 🔐 CONNEXION (VERSION SIMPLIFIÉE)
  // =====================================
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express_1.Response,
  ) {
    const ip =
      ipAddress || req.ip || (req.headers['x-forwarded-for'] as string);
    const result = await this.authService.login(loginDto, ip);

    // ✅ Définir le HttpOnly Cookie pour le Refresh Token
    this.setRefreshTokenCookie(res, result.refreshToken);

    // ✅ CHANGEMENT : Retour direct sans wrapper "data"
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  // =====================================
  // 🔄 REFRESH TOKEN (MODIFIÉ POUR COOKIE)
  // =====================================
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: express_2.Request,
    @Res({ passthrough: true }) res: express_2.Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    // ✅ CHANGEMENT : Retour direct sans wrapper "data"
    return {
      accessToken: tokens.accessToken,
    };
  }

  // =====================================
  // 🔑 MOT DE PASSE OUBLIÉ
  // =====================================
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander un lien de réinitialisation' })
  async forgotPassword(@Body(ValidationPipe) dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // =====================================
  // 🔁 RÉINITIALISER MOT DE PASSE
  // =====================================
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token' })
  async resetPassword(@Body(ValidationPipe) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // =====================================
  // 🚪 LOGOUT (CLEAN COOKIE)
  // =====================================
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: express_1.Response) {
    // ✅ Effacer le cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true, // Doit correspondre à la config
      sameSite: 'none',
      path: '/',
      // domain: '.votre-domaine.com' // Optionnel
    });

    return { message: 'Déconnexion réussie' };
  }

  // =====================================
  // 🔧 UTILITAIRE COOKIE
  // =====================================
  private setRefreshTokenCookie(res: express_1.Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // Inaccessible via JS (Sécurité XSS)
      secure: isProd, // Nécessite HTTPS (Indispensable en Prod)
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/',
      // domain: '.monapp.com' // Si frontend et backend partagent un sous-domaine
    });
  }
}
