// src/administrators/administrators.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdministratorsService } from './administrators.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { VerifyOrganizationDto } from './dto/verify-organization.dto';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { AdministratorEntity } from './entities/administrator.entity';
import { AdminGuard } from './guards/admin.guard';
import { AdminPermissionGuard } from './guards/admin-permission.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { RequirePermission } from './decorators/require-permission.decorator';
import {
  AdminPermissionAction,
  AdminRole,
  AdminStatus,
  OrganizationStatus,
  UserStatus,
} from '@prisma/client';
import { JwtAdminAuthGuard } from 'src/common/guards/jwt-admin-auth.guard';

/**
 * 👨‍💼 ADMINISTRATORS CONTROLLER
 *
 * Gère toutes les routes d'administration de la plateforme
 *
 * ROUTES PUBLIQUES :
 * - POST /administrators/login (connexion admin)
 * - POST /administrators/refresh (rafraîchir les tokens)
 *
 * ROUTES PROTÉGÉES (Admin uniquement) :
 * - GET /administrators/me (profil admin)
 * - PATCH /administrators/me (modifier profil)
 * - PATCH /administrators/me/password (changer mot de passe)
 * - POST /administrators (créer un admin - SUPER_ADMIN)
 * - GET /administrators (liste des admins)
 * - PATCH /administrators/:id/deactivate (désactiver un admin)
 * - PATCH /administrators/:id/reactivate (réactiver un admin)
 * - DELETE /administrators/:id (supprimer un admin)
 *
 * ROUTES GESTION ORGANIZATIONS :
 * - GET /administrators/organizations (liste)
 * - PATCH /administrators/organizations/:id/verify (valider)
 * - PATCH /administrators/organizations/:id/suspend (suspendre)
 * - PATCH /administrators/organizations/:id/reactivate (réactiver)
 * - DELETE /administrators/organizations/:id (supprimer)
 *
 * ROUTES GESTION USERS :
 * - GET /administrators/users (liste)
 * - PATCH /administrators/users/:id/suspend (suspendre)
 * - PATCH /administrators/users/:id/reactivate (réactiver)
 * - DELETE /administrators/users/:id (supprimer)
 *
 * ROUTES STATISTIQUES :
 * - GET /administrators/dashboard (stats globales)
 */
@ApiTags('Administrators')
@Controller('administrators')
@UseInterceptors(ClassSerializerInterceptor) // ✅ Exclut les champs @Exclude()
export class AdministratorsController {
  constructor(private readonly administratorsService: AdministratorsService) {}

  // =====================================
  // 🔐 AUTHENTIFICATION ADMIN
  // =====================================

  /**
   * Connexion admin
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion administrateur',
    description: 'Connecte un administrateur avec email et mot de passe',
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      example: {
        administrator: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'admin@infosante.cm',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: 'SUPER_ADMIN',
          isActive: true,
          status: 'ACTIVE',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  @ApiResponse({ status: 403, description: 'Compte désactivé ou supprimé' })
  async login(@Body() loginDto: LoginAdminDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.administratorsService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * Rafraîchir les tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rafraîchir les tokens',
    description: 'Génère de nouveaux access et refresh tokens',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Tokens rafraîchis',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou expiré' })
  async refresh(@Req() req: Request) {
    const refreshToken = req.headers.authorization?.split(' ')[1];
    return this.administratorsService.refreshTokens(refreshToken!);
  }

  // =====================================
  // 👤 PROFIL ADMIN
  // =====================================

  /**
   * Récupérer le profil de l'admin connecté
   */
  @Get('me')
  @UseGuards(JwtAdminAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Profil admin connecté',
    description: "Récupère le profil complet de l'administrateur connecté",
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré',
    type: AdministratorEntity,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(@CurrentAdmin() admin: { sub: string }) {
    return this.administratorsService.getProfile(admin.sub);
  }

  /**
   * Mettre à jour le profil
   */
  @Patch('me')
  @UseGuards(JwtAdminAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Modifier le profil',
    description: "Met à jour le profil de l'administrateur connecté",
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour',
    type: AdministratorEntity,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async updateProfile(
    @CurrentAdmin() admin: { sub: string },
    @Body() updateDto: UpdateAdminDto,
  ) {
    return this.administratorsService.updateProfile(
      admin.sub,
      updateDto,
      admin.sub,
    );
  }

  /**
   * Changer le mot de passe
   */
  @Patch('me/password')
  @UseGuards(JwtAdminAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Changer le mot de passe',
    description: "Change le mot de passe de l'administrateur connecté",
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Mot de passe changé',
    schema: {
      example: {
        message: 'Mot de passe changé avec succès',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Mot de passe actuel incorrect' })
  async updatePassword(
    @CurrentAdmin() admin: { sub: string },
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.administratorsService.updatePassword(
      admin.sub,
      updatePasswordDto,
    );
  }

  // =====================================
  // 👨‍💼 GESTION DES ADMINS
  // =====================================

  /**
   * Créer un nouvel admin (SUPER_ADMIN uniquement)
   */
  @Post()
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.MANAGE_ADMINS)
  @ApiOperation({
    summary: 'Créer un administrateur',
    description: 'Crée un nouvel administrateur (réservé aux SUPER_ADMIN)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Admin créé',
    type: AdministratorEntity,
  })
  @ApiResponse({ status: 403, description: 'Permission refusée' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(
    @CurrentAdmin() admin: { sub: string },
    @Body() registerDto: RegisterAdminDto,
  ) {
    return this.administratorsService.register(admin.sub, registerDto);
  }

  /**
   * Liste des administrateurs
   */
  @Get()
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.MANAGE_ADMINS)
  @ApiOperation({
    summary: 'Liste des administrateurs',
    description: 'Récupère la liste paginée des administrateurs',
  })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: AdminRole,
    example: AdminRole.MODERATOR,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AdminStatus,
    example: AdminStatus.ACTIVE,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des admins',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'admin@infosante.cm',
            firstName: 'Jean',
            lastName: 'Dupont',
            role: 'SUPER_ADMIN',
            isActive: true,
            status: 'ACTIVE',
          },
        ],
        meta: {
          total: 10,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  async getAdmins(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: AdminRole,
    @Query('status') status?: AdminStatus,
  ) {
    return this.administratorsService.getAdmins(
      page ? +page : 1,
      limit ? +limit : 20,
      role,
      status,
    );
  }

  /**
   * Désactiver un admin
   */
  @Patch(':id/deactivate')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.MANAGE_ADMINS)
  @ApiOperation({
    summary: 'Désactiver un administrateur',
    description: 'Désactive un administrateur (il ne pourra plus se connecter)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Admin désactivé',
    schema: {
      example: {
        message: 'Administrateur désactivé avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async deactivateAdmin(
    @Param('id') id: string,
    @CurrentAdmin() admin: { sub: string },
  ) {
    return this.administratorsService.deactivateAdmin(id, admin.sub);
  }

  /**
   * Réactiver un admin
   */
  @Patch(':id/reactivate')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.MANAGE_ADMINS)
  @ApiOperation({
    summary: 'Réactiver un administrateur',
    description: 'Réactive un administrateur désactivé',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Admin réactivé',
    schema: {
      example: {
        message: 'Administrateur réactivé avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async reactivateAdmin(@Param('id') id: string) {
    return this.administratorsService.reactivateAdmin(id);
  }

  /**
   * Supprimer un admin (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.MANAGE_ADMINS)
  @ApiOperation({
    summary: 'Supprimer un administrateur',
    description: 'Supprime un administrateur (soft delete)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Admin supprimé',
    schema: {
      example: {
        message: 'Administrateur supprimé avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Administrateur non trouvé' })
  async deleteAdmin(
    @Param('id') id: string,
    @CurrentAdmin() admin: { sub: string },
  ) {
    return this.administratorsService.deleteAdmin(id, admin.sub);
  }

  // =====================================
  // 🏥 GESTION DES ORGANIZATIONS
  // =====================================

  /**
   * Liste des organisations (pour admin)
   */
  @Get('organizations')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.VIEW_ORGANIZATIONS)
  @ApiOperation({
    summary: 'Liste des organisations',
    description: 'Récupère la liste paginée des organisations avec filtres',
  })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrganizationStatus,
    example: OrganizationStatus.PENDING,
  })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Liste des organisations',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Hôpital Laquintinie',
            email: 'contact@laquintinie.cm',
            type: 'HOSPITAL_PUBLIC',
            status: 'PENDING',
            isVerified: false,
            city: 'Douala',
          },
        ],
        meta: {
          total: 50,
          page: 1,
          limit: 20,
          totalPages: 3,
        },
      },
    },
  })
  async getOrganizations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: OrganizationStatus,
    @Query('isVerified') isVerified?: boolean,
    @Query('search') search?: string,
  ) {
    return this.administratorsService.getOrganizations(
      page ? +page : 1,
      limit ? +limit : 20,
      status,
      isVerified,
      search,
    );
  }

  /**
   * Valider une organisation
   */
  @Patch('organizations/:id/verify')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.VALIDATE_ORGANIZATION)
  @ApiOperation({
    summary: 'Valider une organisation',
    description: 'Valide ou rejette une organisation en attente',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Organisation validée',
    schema: {
      example: {
        message: 'Organisation validée avec succès',
        organization: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Hôpital Laquintinie',
          status: 'ACTIVE',
          isVerified: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée' })
  async verifyOrganization(
    @Param('id') id: string,
    @Body() verifyDto: VerifyOrganizationDto,
    @CurrentAdmin() admin: { sub: string },
  ) {
    return this.administratorsService.verifyOrganization(
      id,
      verifyDto,
      admin.sub,
    );
  }

  /**
   * Suspendre une organisation
   */
  @Patch('organizations/:id/suspend')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.SUSPEND_ORGANIZATION)
  @ApiOperation({
    summary: 'Suspendre une organisation',
    description: 'Suspend une organisation active',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Organisation suspendue',
    schema: {
      example: {
        message: 'Organisation suspendue avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée' })
  async suspendOrganization(
    @Param('id') id: string,
    @Body() suspendDto: SuspendOrganizationDto,
    @CurrentAdmin() admin: { sub: string },
  ) {
    return this.administratorsService.suspendOrganization(
      id,
      suspendDto,
      admin.sub,
    );
  }

  /**
   * Réactiver une organisation suspendue
   */
  @Patch('organizations/:id/reactivate')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.SUSPEND_ORGANIZATION)
  @ApiOperation({
    summary: 'Réactiver une organisation',
    description: 'Réactive une organisation suspendue',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Organisation réactivée',
    schema: {
      example: {
        message: 'Organisation réactivée avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée' })
  async reactivateOrganization(@Param('id') id: string) {
    return this.administratorsService.reactivateOrganization(id);
  }

  /**
   * Supprimer une organisation (soft delete)
   */
  @Delete('organizations/:id')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.DELETE_ORGANIZATION)
  @ApiOperation({
    summary: 'Supprimer une organisation',
    description: 'Supprime une organisation (soft delete)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Organisation supprimée',
    schema: {
      example: {
        message: 'Organisation supprimée avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organisation non trouvée' })
  async deleteOrganization(@Param('id') id: string) {
    return this.administratorsService.deleteOrganization(id);
  }

  // =====================================
  // 👥 GESTION DES USERS
  // =====================================

  /**
   * Liste des utilisateurs (pour admin)
   */
  @Get('users')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.VIEW_USERS)
  @ApiOperation({
    summary: 'Liste des utilisateurs',
    description: 'Récupère la liste paginée des utilisateurs avec filtres',
  })
  @ApiBearerAuth()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'user@example.com',
            firstName: 'Marie',
            lastName: 'Ngono',
            status: 'ACTIVE',
            city: 'Yaoundé',
          },
        ],
        meta: {
          total: 1000,
          page: 1,
          limit: 20,
          totalPages: 50,
        },
      },
    },
  })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
  ) {
    return this.administratorsService.getUsers(
      page ? +page : 1,
      limit ? +limit : 20,
      status,
      search,
    );
  }

  /**
   * Suspendre un utilisateur
   */
  @Patch('users/:id/suspend')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.SUSPEND_USER)
  @ApiOperation({
    summary: 'Suspendre un utilisateur',
    description: 'Suspend un utilisateur actif',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Utilisateur suspendu',
    schema: {
      example: {
        message: 'Utilisateur suspendu avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async suspendUser(
    @Param('id') id: string,
    @Body() suspendDto: SuspendUserDto,
  ) {
    return this.administratorsService.suspendUser(id, suspendDto);
  }

  /**
   * Réactiver un utilisateur suspendu
   */
  @Patch('users/:id/reactivate')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.SUSPEND_USER)
  @ApiOperation({
    summary: 'Réactiver un utilisateur',
    description: 'Réactive un utilisateur suspendu',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Utilisateur réactivé',
    schema: {
      example: {
        message: 'Utilisateur réactivé avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async reactivateUser(@Param('id') id: string) {
    return this.administratorsService.reactivateUser(id);
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  @Delete('users/:id')
  @UseGuards(JwtAdminAuthGuard, AdminGuard, AdminPermissionGuard)
  @RequirePermission(AdminPermissionAction.DELETE_USER)
  @ApiOperation({
    summary: 'Supprimer un utilisateur',
    description: 'Supprime un utilisateur (soft delete)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Utilisateur supprimé',
    schema: {
      example: {
        message: 'Utilisateur supprimé avec succès',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async deleteUser(@Param('id') id: string) {
    return this.administratorsService.deleteUser(id);
  }

  // =====================================
  // 📊 STATISTIQUES
  // =====================================

  /**
   * Dashboard avec statistiques globales
   */
  @Get('dashboard')
  @UseGuards(JwtAdminAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Dashboard administrateur',
    description: 'Récupère les statistiques globales de la plateforme',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées',
    schema: {
      example: {
        users: {
          total: 5000,
          active: 4500,
        },
        organizations: {
          total: 150,
          pending: 10,
          active: 130,
          suspended: 10,
        },
        content: {
          announcements: 500,
          articles: 1200,
        },
      },
    },
  })
  async getDashboard() {
    return this.administratorsService.getDashboard();
  }
}
