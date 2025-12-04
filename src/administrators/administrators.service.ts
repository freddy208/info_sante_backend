/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/administrators/administrators.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { VerifyOrganizationDto } from './dto/verify-organization.dto';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { AdministratorEntity } from './entities/administrator.entity';
import {
  AdminRole,
  AdminStatus,
  OrganizationStatus,
  UserStatus,
  UserType,
  DeviceType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * 👨‍💼 ADMINISTRATORS SERVICE
 *
 * Gère toutes les opérations liées aux administrateurs de la plateforme
 *
 * FONCTIONNALITÉS :
 * - Authentification admin (register, login, refresh)
 * - Gestion du profil admin
 * - Validation et gestion des organisations
 * - Gestion des utilisateurs
 * - Gestion des autres admins (SUPER_ADMIN)
 * - Statistiques et dashboard
 */
@Injectable()
export class AdministratorsService {
  private readonly logger = new Logger(AdministratorsService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // =====================================
  // 🔐 AUTHENTIFICATION ADMIN
  // =====================================

  /**
   * Créer un nouvel administrateur
   *
   * IMPORTANT : Seul un SUPER_ADMIN peut créer un admin
   *
   * @param creatorId - ID de l'admin créateur (doit être SUPER_ADMIN)
   * @param registerDto - Données du nouvel admin
   */
  async register(
    creatorId: string,
    registerDto: RegisterAdminDto,
  ): Promise<AdministratorEntity> {
    const { email, password, firstName, lastName, phone, role } = registerDto;

    // ✅ 1. Vérifier que le créateur est un SUPER_ADMIN
    const creator = await this.prisma.administrator.findUnique({
      where: { id: creatorId },
    });

    if (!creator || creator.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Seul un SUPER_ADMIN peut créer un administrateur',
      );
    }

    // ✅ 2. Vérifier que l'email n'existe pas déjà
    const existingEmail = await this.prisma.administrator.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    // ✅ 3. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // ✅ 4. Créer l'administrateur
      const admin = await this.prisma.administrator.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
          createdBy: creatorId,
          status: AdminStatus.ACTIVE,
        },
      });

      this.logger.log(
        `✅ Admin créé : ${admin.firstName} ${admin.lastName} (${admin.role})`,
      );

      return new AdministratorEntity(admin as any);
    } catch (error: any) {
      this.logger.error(`❌ Erreur création admin : ${error.message}`);
      throw new BadRequestException(
        "Erreur lors de la création de l'administrateur",
      );
    }
  }

  /**
   * Connexion d'un administrateur
   *
   * @param loginDto - Email et mot de passe
   * @param ipAddress - Adresse IP
   * @param userAgent - User agent
   */
  async login(
    loginDto: LoginAdminDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    administrator: AdministratorEntity;
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, password } = loginDto;

    // ✅ 1. Vérifier que l'admin existe
    const admin = await this.prisma.administrator.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // ✅ 2. Vérifier le statut
    if (admin.status === AdminStatus.DELETED) {
      throw new ForbiddenException('Ce compte a été supprimé');
    }

    if (admin.status === AdminStatus.INACTIVE || !admin.isActive) {
      throw new ForbiddenException('Ce compte est désactivé');
    }

    // ✅ 3. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // ✅ 4. Mettre à jour lastLoginAt et lastLoginIp
    await this.prisma.administrator.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // ✅ 5. Générer les tokens JWT
    const tokens = await this.generateTokens(admin.id);

    // ✅ 6. Créer la session
    await this.createSession(
      admin.id,
      tokens.accessToken,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    this.logger.log(
      `✅ Connexion admin : ${admin.firstName} ${admin.lastName} (${admin.role})`,
    );

    return {
      administrator: new AdministratorEntity(admin as any),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Rafraîchir les tokens
   *
   * @param refreshToken - Refresh token
   */
  // src/administrators/administrators.service.ts

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // ✅ 1. Vérifier le refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      // Vérifier que c'est bien un refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Type de token invalide');
      }

      // ✅ 2. Vérifier que la session existe et est active
      const session = await this.prisma.session.findUnique({
        where: { refreshToken },
      });

      if (!session || !session.isActive) {
        throw new UnauthorizedException('Session invalide ou expirée');
      }

      // ✅ 3. Vérifier que l'admin existe et est actif
      const admin = await this.prisma.administrator.findUnique({
        where: { id: session.administratorId || payload.sub },
      });

      if (!admin || admin.status === AdminStatus.DELETED || !admin.isActive) {
        throw new UnauthorizedException('Administrateur invalide ou désactivé');
      }

      // ✅ 4. Générer de nouveaux tokens
      const tokens = await this.generateTokens(admin.id);

      // ✅ 5. Mettre à jour la session
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(
            Date.now() +
              this.parseDuration(
                this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
              ),
          ),
          lastActivityAt: new Date(),
        },
      });

      this.logger.log(
        `🔄 Tokens rafraîchis pour ${admin.firstName} ${admin.lastName}`,
      );

      return tokens;
    } catch (error: any) {
      this.logger.error(`❌ Erreur refresh token : ${error.message}`);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  // =====================================
  // 👤 PROFIL ADMINISTRATEUR
  // =====================================

  /**
   * Récupérer le profil de l'admin connecté
   *
   * @param adminId - ID de l'admin
   */
  async getProfile(adminId: string): Promise<AdministratorEntity> {
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
      include: {
        permissions: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    return new AdministratorEntity(admin as any);
  }

  /**
   * Mettre à jour le profil d'un admin
   *
   * @param adminId - ID de l'admin
   * @param updateDto - Données à mettre à jour
   * @param currentAdminId - ID de l'admin qui effectue la modification
   */
  async updateProfile(
    adminId: string,
    updateDto: UpdateAdminDto,
    currentAdminId: string,
  ): Promise<AdministratorEntity> {
    // ✅ Vérifier que l'admin existe
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    // ✅ Vérifier les permissions pour changer le rôle
    if (updateDto.role && updateDto.role !== admin.role) {
      const currentAdmin = await this.prisma.administrator.findUnique({
        where: { id: currentAdminId },
      });

      if (!currentAdmin || currentAdmin.role !== AdminRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Seul un SUPER_ADMIN peut modifier le rôle',
        );
      }
    }

    // ✅ Mettre à jour
    try {
      const updatedAdmin = await this.prisma.administrator.update({
        where: { id: adminId },
        data: updateDto,
      });

      this.logger.log(`✅ Profil admin mis à jour : ${updatedAdmin.id}`);

      return new AdministratorEntity(updatedAdmin as any);
    } catch (error: any) {
      this.logger.error(`❌ Erreur mise à jour profil : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour du profil');
    }
  }

  /**
   * Changer le mot de passe d'un admin
   *
   * @param adminId - ID de l'admin
   * @param updatePasswordDto - Ancien et nouveau mot de passe
   */
  async updatePassword(
    adminId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = updatePasswordDto;

    // ✅ Récupérer l'admin
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    // ✅ Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    // ✅ Vérifier que le nouveau mot de passe est différent
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }

    // ✅ Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Mettre à jour
    await this.prisma.administrator.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    this.logger.log(
      `🔑 Mot de passe changé : ${admin.firstName} ${admin.lastName}`,
    );

    return {
      message: 'Mot de passe changé avec succès',
    };
  }

  // =====================================
  // 🏥 GESTION DES ORGANIZATIONS
  // =====================================

  /**
   * Valider ou rejeter une organisation
   *
   * @param organizationId - ID de l'organisation
   * @param verifyDto - Validation ou rejet
   * @param adminId - ID de l'admin qui valide
   */
  async verifyOrganization(
    organizationId: string,
    verifyDto: VerifyOrganizationDto,
    adminId: string,
  ): Promise<{ message: string; organization: any }> {
    const { isVerified, comment } = verifyDto;

    // ✅ Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Vérifier que l'organisation est en attente
    if (organization.status !== OrganizationStatus.PENDING) {
      throw new BadRequestException(
        'Cette organisation a déjà été validée ou rejetée',
      );
    }

    try {
      // ✅ Mettre à jour le statut
      const updatedOrganization = await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          isVerified,
          verifiedAt: isVerified ? new Date() : null,
          verifiedBy: adminId,
          status: isVerified
            ? OrganizationStatus.ACTIVE
            : OrganizationStatus.INACTIVE,
        },
      });

      this.logger.log(
        `${isVerified ? '✅' : '❌'} Organisation ${isVerified ? 'validée' : 'rejetée'} : ${organization.name}`,
      );

      // TODO: Envoyer un email/notification à l'organisation

      return {
        message: `Organisation ${isVerified ? 'validée' : 'rejetée'} avec succès`,
        organization: updatedOrganization,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur validation organisation : ${error.message}`);
      throw new BadRequestException('Erreur lors de la validation');
    }
  }

  /**
   * Suspendre une organisation
   *
   * @param organizationId - ID de l'organisation
   * @param suspendDto - Raison de la suspension
   * @param adminId - ID de l'admin qui suspend
   */
  async suspendOrganization(
    organizationId: string,
    suspendDto: SuspendOrganizationDto,
    adminId: string,
  ): Promise<{ message: string }> {
    const { reason } = suspendDto;

    // ✅ Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Vérifier que l'organisation n'est pas déjà suspendue
    if (organization.status === OrganizationStatus.SUSPENDED) {
      throw new BadRequestException('Cette organisation est déjà suspendue');
    }

    try {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          status: OrganizationStatus.SUSPENDED,
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedBy: adminId,
        },
      });

      this.logger.log(`🚫 Organisation suspendue : ${organization.name}`);

      // TODO: Envoyer un email/notification à l'organisation

      return {
        message: 'Organisation suspendue avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur suspension organisation : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suspension');
    }
  }

  /**
   * Réactiver une organisation suspendue
   *
   * @param organizationId - ID de l'organisation
   */
  async reactivateOrganization(
    organizationId: string,
  ): Promise<{ message: string }> {
    // ✅ Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Vérifier que l'organisation est suspendue
    if (organization.status !== OrganizationStatus.SUSPENDED) {
      throw new BadRequestException("Cette organisation n'est pas suspendue");
    }

    try {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          status: OrganizationStatus.ACTIVE,
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null,
        },
      });

      this.logger.log(`✅ Organisation réactivée : ${organization.name}`);

      // TODO: Envoyer un email/notification à l'organisation

      return {
        message: 'Organisation réactivée avec succès',
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur réactivation organisation : ${error.message}`,
      );
      throw new BadRequestException('Erreur lors de la réactivation');
    }
  }

  /**
   * Supprimer une organisation (soft delete)
   *
   * @param organizationId - ID de l'organisation
   */
  async deleteOrganization(
    organizationId: string,
  ): Promise<{ message: string }> {
    // ✅ Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Vérifier que l'organisation n'est pas déjà supprimée
    if (organization.status === OrganizationStatus.DELETED) {
      throw new BadRequestException('Cette organisation est déjà supprimée');
    }

    try {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          status: OrganizationStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`🗑️ Organisation supprimée : ${organization.name}`);

      return {
        message: 'Organisation supprimée avec succès',
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur suppression organisation : ${error.message}`,
      );
      throw new BadRequestException('Erreur lors de la suppression');
    }
  }

  /**
   * Liste des organisations avec filtres (pour admin)
   *
   * @param page - Numéro de page
   * @param limit - Nombre par page
   * @param status - Filtrer par statut
   * @param isVerified - Filtrer par vérification
   * @param search - Recherche par nom
   */
  async getOrganizations(
    page: number = 1,
    limit: number = 20,
    status?: OrganizationStatus,
    isVerified?: boolean,
    search?: string,
  ) {
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    // ✅ Construction des filtres
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: organizations,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // =====================================
  // 👥 GESTION DES USERS
  // =====================================

  /**
   * Suspendre un utilisateur
   *
   * @param userId - ID de l'utilisateur
   * @param suspendDto - Raison de la suspension
   */
  async suspendUser(
    userId: string,
    suspendDto: SuspendUserDto,
  ): Promise<{ message: string }> {
    const { reason } = suspendDto;

    // ✅ Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // ✅ Vérifier que l'utilisateur n'est pas déjà suspendu
    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Cet utilisateur est déjà suspendu');
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.SUSPENDED,
        },
      });

      this.logger.log(
        `🚫 Utilisateur suspendu : ${user.firstName} ${user.lastName} (${reason})`,
      );

      // TODO: Envoyer un email/notification à l'utilisateur

      return {
        message: 'Utilisateur suspendu avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur suspension utilisateur : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suspension');
    }
  }

  /**
   * Réactiver un utilisateur suspendu
   *
   * @param userId - ID de l'utilisateur
   */
  async reactivateUser(userId: string): Promise<{ message: string }> {
    // ✅ Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // ✅ Vérifier que l'utilisateur est suspendu
    if (user.status !== UserStatus.SUSPENDED) {
      throw new BadRequestException("Cet utilisateur n'est pas suspendu");
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
        },
      });

      this.logger.log(
        `✅ Utilisateur réactivé : ${user.firstName} ${user.lastName}`,
      );

      // TODO: Envoyer un email/notification à l'utilisateur

      return {
        message: 'Utilisateur réactivé avec succès',
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Erreur réactivation utilisateur : ${error.message}`,
      );
      throw new BadRequestException('Erreur lors de la réactivation');
    }
  }

  /**
   * Supprimer un utilisateur (soft delete)
   *
   * @param userId - ID de l'utilisateur
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    // ✅ Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // ✅ Vérifier que l'utilisateur n'est pas déjà supprimé
    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException('Cet utilisateur est déjà supprimé');
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      this.logger.log(
        `🗑️ Utilisateur supprimé : ${user.firstName} ${user.lastName}`,
      );

      return {
        message: 'Utilisateur supprimé avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur suppression utilisateur : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suppression');
    }
  }

  /**
   * Liste des utilisateurs avec filtres (pour admin)
   *
   * @param page - Numéro de page
   * @param limit - Nombre par page
   * @param status - Filtrer par statut
   * @param search - Recherche par nom/email
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    status?: UserStatus,
    search?: string,
  ) {
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    // ✅ Construction des filtres
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          city: true,
          region: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // =====================================
  // 👨‍💼 GESTION DES ADMINS
  // =====================================

  /**
   * Liste des administrateurs
   *
   * @param page - Numéro de page
   * @param limit - Nombre par page
   * @param role - Filtrer par rôle
   * @param status - Filtrer par statut
   */
  async getAdmins(
    page: number = 1,
    limit: number = 20,
    role?: AdminRole,
    status?: AdminStatus,
  ) {
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const [admins, total] = await Promise.all([
      this.prisma.administrator.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.administrator.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: admins.map((admin) => new AdministratorEntity(admin as any)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Désactiver un administrateur
   *
   * @param adminId - ID de l'admin à désactiver
   * @param currentAdminId - ID de l'admin qui effectue l'action
   */
  async deactivateAdmin(
    adminId: string,
    currentAdminId: string,
  ): Promise<{ message: string }> {
    // ✅ Vérifier que ce n'est pas le même admin
    if (adminId === currentAdminId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous désactiver vous-même',
      );
    }

    // ✅ Vérifier que l'admin existe
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    if (!admin.isActive) {
      throw new BadRequestException('Cet administrateur est déjà désactivé');
    }

    try {
      await this.prisma.administrator.update({
        where: { id: adminId },
        data: {
          isActive: false,
          status: AdminStatus.INACTIVE,
        },
      });

      this.logger.log(
        `🚫 Admin désactivé : ${admin.firstName} ${admin.lastName}`,
      );

      return {
        message: 'Administrateur désactivé avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur désactivation admin : ${error.message}`);
      throw new BadRequestException('Erreur lors de la désactivation');
    }
  }

  /**
   * Réactiver un administrateur
   *
   * @param adminId - ID de l'admin à réactiver
   */
  async reactivateAdmin(adminId: string): Promise<{ message: string }> {
    // ✅ Vérifier que l'admin existe
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    if (admin.isActive) {
      throw new BadRequestException('Cet administrateur est déjà actif');
    }

    try {
      await this.prisma.administrator.update({
        where: { id: adminId },
        data: {
          isActive: true,
          status: AdminStatus.ACTIVE,
        },
      });

      this.logger.log(
        `✅ Admin réactivé : ${admin.firstName} ${admin.lastName}`,
      );

      return {
        message: 'Administrateur réactivé avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur réactivation admin : ${error.message}`);
      throw new BadRequestException('Erreur lors de la réactivation');
    }
  }

  /**
   * Supprimer un administrateur (soft delete)
   *
   * @param adminId - ID de l'admin à supprimer
   * @param currentAdminId - ID de l'admin qui effectue l'action
   */
  async deleteAdmin(
    adminId: string,
    currentAdminId: string,
  ): Promise<{ message: string }> {
    // ✅ Vérifier que ce n'est pas le même admin
    if (adminId === currentAdminId) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous supprimer vous-même',
      );
    }

    // ✅ Vérifier que l'admin existe
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    if (admin.status === AdminStatus.DELETED) {
      throw new BadRequestException('Cet administrateur est déjà supprimé');
    }

    try {
      await this.prisma.administrator.update({
        where: { id: adminId },
        data: {
          status: AdminStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      this.logger.log(
        `🗑️ Admin supprimé : ${admin.firstName} ${admin.lastName}`,
      );

      return {
        message: 'Administrateur supprimé avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur suppression admin : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suppression');
    }
  }

  // =====================================
  // 📊 STATISTIQUES
  // =====================================

  /**
   * Dashboard avec statistiques globales
   */
  async getDashboard() {
    const [
      totalUsers,
      activeUsers,
      totalOrganizations,
      pendingOrganizations,
      activeOrganizations,
      suspendedOrganizations,
      totalAnnouncements,
      totalArticles,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.organization.count(),
      this.prisma.organization.count({
        where: { status: OrganizationStatus.PENDING },
      }),
      this.prisma.organization.count({
        where: { status: OrganizationStatus.ACTIVE },
      }),
      this.prisma.organization.count({
        where: { status: OrganizationStatus.SUSPENDED },
      }),
      this.prisma.announcement.count(),
      this.prisma.article.count(),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      organizations: {
        total: totalOrganizations,
        pending: pendingOrganizations,
        active: activeOrganizations,
        suspended: suspendedOrganizations,
      },
      content: {
        announcements: totalAnnouncements,
        articles: totalArticles,
      },
    };
  }

  // =====================================
  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  // =====================================

  /**
   * Générer les tokens JWT
   */
  // src/administrators/administrators.service.ts

  private async generateTokens(adminId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Récupérer l'administrateur pour obtenir l'email
    const admin = await this.prisma.administrator.findUnique({
      where: { id: adminId },
      select: { email: true },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur non trouvé');
    }

    // Payload pour l'access token
    const accessPayload = {
      sub: adminId,
      email: admin.email,
      type: 'access' as const,
    };

    // Payload pour le refresh token
    const refreshPayload = {
      sub: adminId,
      email: admin.email,
      type: 'refresh' as const,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn') as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Créer une session
   */
  private async createSession(
    adminId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() +
        this.parseDuration(
          this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
        ),
    );

    await this.prisma.session.create({
      data: {
        userType: UserType.ADMINISTRATOR,
        administratorId: adminId,
        accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        deviceType: DeviceType.WEB,
        isActive: true,
        expiresAt,
        lastActivityAt: new Date(),
      },
    });
  }

  /**
   * Convertir une durée string en millisecondes
   */
  private parseDuration(duration: string): number {
    const units: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default: 7 jours

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * units[unit];
  }
}
