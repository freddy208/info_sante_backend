/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/users/users.controller.ts

import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { UserStatus } from '@prisma/client';

/**
 * 👥 USERS CONTROLLER
 *
 * Gère toutes les routes liées aux utilisateurs.
 *
 * ROUTES PUBLIQUES : Aucune (toutes protégées)
 * ROUTES USER : /me/* (gestion de son propre profil)
 * ROUTES ADMIN : /users (gestion de tous les utilisateurs)
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ Toutes les routes sont protégées
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =====================================
  // 📋 LISTE DES UTILISATEURS (ADMIN ONLY)
  // =====================================

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN') // ✅ Seuls les admins peuvent lister les utilisateurs
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liste des utilisateurs (Admin)',
    description: `
      Récupère la liste paginée de tous les utilisateurs.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Fonctionnalités :**
      - Pagination (page, limit)
      - Filtrage par statut (ACTIVE, SUSPENDED, DELETED, etc.)
      - Recherche par email, nom ou prénom
      
      **Paramètres de pagination :**
      - page : Numéro de la page (défaut : 1)
      - limit : Nombre d'utilisateurs par page (défaut : 10, max : 100)
      
      **Exemples de filtres :**
      - \`?status=ACTIVE\` : Uniquement les utilisateurs actifs
      - \`?search=john\` : Rechercher "john" dans email, prénom, nom
      - \`?page=2&limit=20\` : Page 2 avec 20 résultats
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de la page',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: "Nombre d'utilisateurs par page (max: 100)",
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    description: 'Filtrer par statut',
    example: UserStatus.ACTIVE,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Rechercher par email, prénom ou nom',
    example: 'john',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs récupérée avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              email: 'john.doe@example.com',
              firstName: 'John',
              lastName: 'Doe',
              phone: '+237 6 XX XX XX XX',
              avatar: null,
              city: 'Douala',
              region: 'Littoral',
              status: 'ACTIVE',
              isEmailVerified: false,
              isPhoneVerified: false,
              lastLoginAt: '2025-11-24T12:00:00.000Z',
              createdAt: '2025-11-24T10:00:00.000Z',
              updatedAt: '2025-11-24T12:00:00.000Z',
            },
          ],
          meta: {
            total: 100,
            page: 1,
            limit: 10,
            totalPages: 10,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (permissions insuffisantes)',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page, limit, status, search);
  }

  // =====================================
  // 👤 MON PROFIL (USER)
  // =====================================

  @Get('me/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir mon profil',
    description: `
      Récupère le profil complet de l'utilisateur connecté.
      
      **Authentification requise :** Oui (JWT token)
      
      **Retourne :**
      - Toutes les informations du profil (sauf données sensibles)
      - Statut de vérification email/téléphone
      - Date de dernière connexion
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: UserEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyProfile(@CurrentUser('id') userId: string): Promise<UserEntity> {
    return this.usersService.getProfile(userId);
  }

  // =====================================
  // ✏️ MODIFIER MON PROFIL (USER)
  // =====================================

  @Patch('me/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Modifier mon profil',
    description: `
      Modifie le profil de l'utilisateur connecté.
      
      **Champs modifiables :**
      - firstName (Prénom)
      - lastName (Nom)
      - phone (Téléphone - vérifié unique)
      - dateOfBirth (Date de naissance)
      - gender (Genre)
      - city (Ville)
      - region (Région)
      
      **IMPORTANT :**
      - Tous les champs sont optionnels (PATCH partiel)
      - Le téléphone doit être unique
      - On ne peut pas modifier : email, password, status
      
      **Sécurité :**
      - Vérification que le téléphone n'est pas déjà utilisé
      - Impossible de modifier un compte suspendu/supprimé
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Profil modifié avec succès',
    type: UserEntity,
  })
  @ApiResponse({
    status: 409,
    description: 'Téléphone déjà utilisé',
  })
  @ApiResponse({
    status: 403,
    description: 'Compte suspendu ou supprimé',
  })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  // =====================================
  // 🔐 CHANGER MON MOT DE PASSE (USER)
  // =====================================

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Changer mon mot de passe',
    description: `
      Permet à l'utilisateur de changer son mot de passe.
      
      **Processus de sécurité :**
      1. Vérification de l'ancien mot de passe (pas juste le token)
      2. Validation du nouveau mot de passe (min 8 caractères, etc.)
      3. Vérification que le nouveau mot de passe est différent
      4. Hashage du nouveau mot de passe
      
      **Pourquoi demander l'ancien mot de passe ?**
      Pour s'assurer que c'est bien le propriétaire du compte,
      et pas quelqu'un qui aurait volé le token JWT.
      
      **IMPORTANT :**
      Le nouveau mot de passe doit contenir :
      - Au moins 8 caractères
      - Au moins une majuscule
      - Au moins une minuscule
      - Au moins un chiffre
      - Au moins un caractère spécial (@$!%*?&)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe modifié avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Mot de passe modifié avec succès',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Mot de passe actuel incorrect',
  })
  @ApiResponse({
    status: 400,
    description: "Le nouveau mot de passe doit être différent de l'ancien",
  })
  async updateMyPassword(
    @CurrentUser('id') userId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(userId, updatePasswordDto);
  }

  // =====================================
  // 🔍 DÉTAILS D'UN UTILISATEUR (ADMIN)
  // =====================================

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Détails d'un utilisateur (Admin)",
    description: `
      Récupère les détails complets d'un utilisateur spécifique.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Retourne :**
      - Toutes les informations du profil
      - Date de dernière connexion et IP
      - Date de suppression (si soft delete)
    `,
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur trouvé',
    type: UserEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé',
  })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<UserEntity> {
    return this.usersService.findOne(id);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN UTILISATEUR (ADMIN)
  // =====================================

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un utilisateur (Admin)',
    description: `
      Supprime un utilisateur (soft delete).
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Soft Delete :**
      - L'utilisateur n'est PAS supprimé physiquement de la BD
      - Son statut passe à DELETED
      - Il ne peut plus se connecter
      - Possibilité de restaurer ultérieurement
      
      **Avantages :**
      - Garde l'historique complet
      - Préserve les relations (comments, reactions, etc.)
      - Audit trail intact
      - Possibilité de statistiques
    `,
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur à supprimer",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur supprimé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Utilisateur supprimé avec succès',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiResponse({
    status: 400,
    description: 'Utilisateur déjà supprimé',
  })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.remove(id);
  }

  // =====================================
  // ⛔ SUSPENDRE UN UTILISATEUR (ADMIN)
  // =====================================

  @Patch(':id/suspend')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspendre un utilisateur (Admin)',
    description: `
      Suspend le compte d'un utilisateur.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Effet de la suspension :**
      - Le statut passe à SUSPENDED
      - L'utilisateur ne peut plus se connecter
      - Impossible d'utiliser l'API
      - Peut être réactivé ultérieurement
      
      **Cas d'usage :**
      - Comportement inapproprié
      - Spam
      - Violation des conditions d'utilisation
      - Enquête en cours
    `,
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur à suspendre",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur suspendu avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Utilisateur suspendu avec succès',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiResponse({
    status: 400,
    description: 'Utilisateur déjà suspendu ou supprimé',
  })
  async suspend(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.suspend(id);
  }

  // =====================================
  // ✅ RÉACTIVER UN UTILISATEUR (ADMIN)
  // =====================================

  @Patch(':id/activate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réactiver un utilisateur (Admin)',
    description: `
      Réactive un compte utilisateur suspendu.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Effet de la réactivation :**
      - Le statut passe à ACTIVE
      - L'utilisateur peut à nouveau se connecter
      - Tous les accès sont restaurés
      
      **Note :**
      - Ne fonctionne que sur les comptes SUSPENDED ou INACTIVE
      - Impossible de réactiver un compte DELETED
    `,
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'utilisateur à réactiver",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur réactivé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Utilisateur réactivé avec succès',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouvé',
  })
  @ApiResponse({
    status: 400,
    description:
      'Utilisateur déjà actif ou impossible de réactiver un compte supprimé',
  })
  async activate(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.activate(id);
  }
}
