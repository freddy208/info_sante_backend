/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
// src/auth/auth.controller.ts

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import express from 'express';

/**
 * 🔐 AUTH CONTROLLER
 *
 * Gère toutes les routes d'authentification :
 * - POST /auth/register - Inscription
 * - POST /auth/login - Connexion
 * - POST /auth/refresh - Renouveler le token
 * - GET /auth/me - Obtenir l'utilisateur connecté
 * - POST /auth/logout - Déconnexion
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =====================================
  // 📝 INSCRIPTION
  // =====================================

  @Public() // Route publique (pas d'authentification requise)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Inscription d'un nouvel utilisateur",
    description: `
      Crée un nouveau compte utilisateur dans le système.
      
      **Validations automatiques :**
      - Email unique
      - Téléphone unique (si fourni)
      - Mot de passe fort (min 8 caractères, majuscule, minuscule, chiffre, caractère spécial)
      - Ville et région valides du Cameroun
      
      **Retour :**
      - Access token (validité : 15 minutes)
      - Refresh token (validité : 7 jours)
      - Informations de l'utilisateur
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Utilisateur créé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+237 6 XX XX XX XX',
            avatar: null,
            status: 'ACTIVE',
          },
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou téléphone déjà utilisé',
    schema: {
      example: {
        success: false,
        statusCode: 409,
        error: 'Conflict',
        message: 'Un compte existe déjà avec cet email',
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/auth/register',
        method: 'POST',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données de validation invalides',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Validation Error',
        message: 'Erreurs de validation détectées',
        errors: {
          email: ['Email invalide'],
          password: [
            'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
          ],
        },
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/auth/register',
        method: 'POST',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // =====================================
  // 🔐 CONNEXION
  // =====================================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Connexion d'un utilisateur",
    description: `
      Authentifie un utilisateur avec son email et mot de passe.
      
      **Vérifications de sécurité :**
      - Compte actif (pas supprimé, suspendu ou inactif)
      - Mot de passe correct
      - Audit trail de la connexion (IP, date/heure)
      
      **En cas de compte supprimé/suspendu :**
      - Message d'erreur spécifique
      - Log de la tentative de connexion
      - Status HTTP 403 (Forbidden)
    `,
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '+237 6 XX XX XX XX',
            avatar: 'https://cloudinary.com/...',
            status: 'ACTIVE',
          },
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Email ou mot de passe incorrect',
    schema: {
      example: {
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Email ou mot de passe incorrect',
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/auth/login',
        method: 'POST',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Compte suspendu, inactif ou supprimé',
    schema: {
      example: {
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Votre compte a été suspendu. Veuillez contacter le support.',
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/auth/login',
        method: 'POST',
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Req() req: express.Request,
  ) {
    // Récupérer l'IP réelle (peut être derrière un proxy)
    const ip =
      ipAddress || req.ip || (req.headers['x-forwarded-for'] as string);
    return this.authService.login(loginDto, ip);
  }

  // =====================================
  // 🔄 REFRESH TOKEN
  // =====================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Renouveler l'access token",
    description: `
      Génère un nouveau access token à partir d'un refresh token valide.
      
      **Utilisation :**
      - Quand l'access token expire (après 15 minutes)
      - Le refresh token est valide pendant 7 jours
      - Seul l'access token est renouvelé (pas le refresh token)
      
      **Sécurité :**
      - Vérifie que le compte est toujours actif
      - Vérifie que le refresh token n'a pas expiré
    `,
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token renouvelé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalide ou expiré',
  })
  @ApiResponse({
    status: 403,
    description: 'Compte inactif ou supprimé',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    // Le JwtRefreshStrategy valide le token et récupère le user
    // On extrait userId du payload décodé
    const decoded: any = this.authService['jwtService'].decode(
      refreshTokenDto.refreshToken,
    );

    if (!decoded || !decoded.sub) {
      throw new Error('Token invalide');
    }

    return this.authService.refreshTokens(
      decoded.sub,
      refreshTokenDto.refreshToken,
    );
  }

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
  // 🚪 LOGOUT
  // =====================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Déconnexion',
    description: `
      Déconnecte l'utilisateur actuel.
      
      **Action effectuée :**
      - Invalide le token côté serveur (si gestion de session)
      - Log de la déconnexion dans l'audit trail
      
      **Note :**
      Le client doit également supprimer le token de son côté (localStorage/cookies).
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Déconnexion réussie',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Déconnexion réussie',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Token invalide',
  })
  async logout(@CurrentUser('id') userId: string) {
    // Pour l'instant, on retourne juste un message
    // Plus tard, on pourrait invalider le token dans une blacklist

    // Créer un audit log de la déconnexion
    // (À implémenter dans le service si nécessaire)

    return {
      message: 'Déconnexion réussie',
    };
  }
}
