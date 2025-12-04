/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/organizations/organizations.service.ts

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
import { LocationService } from '../location/location.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginOrganizationDto } from './dto/login-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import {
  OrganizationType,
  OrganizationStatus,
  ContentType,
  UserType,
  DeviceType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 🏥 ORGANIZATIONS SERVICE
 *
 * Gère toutes les opérations liées aux organisations (hôpitaux, ONG, cliniques, etc.)
 *
 * FONCTIONNALITÉS :
 * - Inscription et connexion
 * - Gestion du profil
 * - Gestion des membres
 * - Validation par administrateur
 * - Suspension/Activation
 * - Recherche et filtrage
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private locationService: LocationService,
  ) {}

  // =====================================
  // 📝 INSCRIPTION D'UNE ORGANISATION
  // =====================================

  /**
   * Inscrire une nouvelle organisation
   *
   * @param registerDto - Données d'inscription
   * @param ipAddress - Adresse IP
   * @param userAgent - User agent
   */
  async register(
    registerDto: RegisterOrganizationDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    organization: OrganizationEntity;
    accessToken: string;
    refreshToken: string;
  }> {
    const {
      name,
      email,
      password,
      type,
      phone,
      whatsapp,
      description,
      website,
      address,
      city,
      region,
      latitude,
      longitude,
      registrationNumber,
      licenseDocument,
      emergencyAvailable,
      insuranceAccepted,
      openingHours,
    } = registerDto;

    // ✅ 1. Vérifier que l'email n'existe pas déjà
    const existingEmail = await this.prisma.organization.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException(
        'Une organisation avec cet email existe déjà',
      );
    }

    // ✅ 2. Vérifier que le numéro d'enregistrement n'existe pas déjà
    const existingRegistrationNumber =
      await this.prisma.organization.findUnique({
        where: { registrationNumber },
      });

    if (existingRegistrationNumber) {
      throw new ConflictException(
        "Une organisation avec ce numéro d'enregistrement existe déjà",
      );
    }

    // ✅ 3. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // ✅ 4. Créer l'organisation (status = PENDING par défaut)
      const organization = await this.prisma.organization.create({
        data: {
          name,
          email,
          password: hashedPassword,
          type,
          phone,
          whatsapp,
          description,
          website,
          address,
          city,
          region,
          latitude,
          longitude,
          registrationNumber,
          licenseDocument,
          emergencyAvailable: emergencyAvailable ?? false,
          insuranceAccepted: insuranceAccepted ?? [],
          openingHours,
          status: OrganizationStatus.PENDING, // ✅ En attente de validation
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });

      this.logger.log(
        `✅ Organisation inscrite : ${organization.name} (${organization.id})`,
      );

      // ✅ 5. Créer la localisation si coordonnées fournies
      if (latitude && longitude) {
        try {
          await this.locationService.create({
            contentType: ContentType.ORGANIZATION,
            contentId: organization.id,
            address,
            city,
            region,
            latitude,
            longitude,
            formattedAddress: `${address}, ${city}, ${region}`,
          });

          this.logger.log(`📍 Localisation créée pour ${organization.name}`);
        } catch (error: any) {
          this.logger.warn(
            `⚠️ Impossible de créer la localisation : ${error.message}`,
          );
          // Ne pas bloquer l'inscription si la localisation échoue
        }
      }

      // ✅ 6. Générer les tokens JWT
      const tokens = await this.generateTokens(organization.id);

      // ✅ 7. Créer la session
      await this.createSession(
        organization.id,
        tokens.accessToken,
        tokens.refreshToken,
        ipAddress,
        userAgent,
      );

      return {
        organization: new OrganizationEntity(organization as any),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors de l'inscription : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'inscription");
    }
  }

  // =====================================
  // 🔐 CONNEXION D'UNE ORGANISATION
  // =====================================

  /**
   * Connexion d'une organisation
   *
   * @param loginDto - Email et mot de passe
   * @param ipAddress - Adresse IP
   * @param userAgent - User agent
   */
  async login(
    loginDto: LoginOrganizationDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    organization: OrganizationEntity;
    accessToken: string;
    refreshToken: string;
  }> {
    const { email, password } = loginDto;

    // ✅ 1. Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { email },
    });

    if (!organization) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // ✅ 2. Vérifier le statut
    if (organization.status === OrganizationStatus.DELETED) {
      throw new ForbiddenException('Ce compte a été supprimé');
    }

    if (organization.status === OrganizationStatus.SUSPENDED) {
      throw new ForbiddenException(
        `Ce compte a été suspendu. Raison : ${organization.suspensionReason || 'Non spécifiée'}`,
      );
    }

    // ✅ 3. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(
      password,
      organization.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // ✅ 4. Mettre à jour lastLoginAt et lastLoginIp
    await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // ✅ 5. Générer les tokens JWT
    const tokens = await this.generateTokens(organization.id);

    // ✅ 6. Créer la session
    await this.createSession(
      organization.id,
      tokens.accessToken,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

    this.logger.log(
      `✅ Connexion réussie : ${organization.name} (${organization.id})`,
    );

    return {
      organization: new OrganizationEntity(organization as any),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // =====================================
  // 🔄 REFRESH TOKEN
  // =====================================

  /**
   * Rafraîchir les tokens
   *
   * @param refreshToken - Refresh token
   */
  // src/organizations/organizations.service.ts

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

      // ✅ 3. Vérifier que l'organisation existe et est active
      const organization = await this.prisma.organization.findUnique({
        where: { id: session.organizationId || payload.sub },
      });

      if (
        !organization ||
        organization.status === OrganizationStatus.DELETED ||
        organization.status === OrganizationStatus.SUSPENDED
      ) {
        throw new UnauthorizedException('Organisation invalide ou suspendue');
      }

      // ✅ 4. Générer de nouveaux tokens
      const tokens = await this.generateTokens(organization.id);

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

      this.logger.log(`🔄 Tokens rafraîchis pour ${organization.name}`);

      return tokens;
    } catch (error: any) {
      this.logger.error(`❌ Erreur refresh token : ${error.message}`);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  // =====================================
  // 👤 PROFIL DE L'ORGANISATION
  // =====================================

  /**
   * Récupérer le profil de l'organisation connectée
   *
   * @param organizationId - ID de l'organisation
   */
  async getProfile(organizationId: string): Promise<OrganizationEntity> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          where: { isActive: true },
        },
        services: {
          include: {
            specialty: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    return new OrganizationEntity(organization as any);
  }

  // =====================================
  // ✏️ METTRE À JOUR LE PROFIL
  // =====================================

  /**
   * Mettre à jour le profil d'une organisation
   *
   * @param organizationId - ID de l'organisation
   * @param updateDto - Données à mettre à jour
   */
  async updateProfile(
    organizationId: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<OrganizationEntity> {
    // ✅ Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Si le téléphone change, vérifier qu'il n'est pas déjà utilisé
    if (updateDto.phone && updateDto.phone !== organization.phone) {
      const existingPhone = await this.prisma.organization.findFirst({
        where: {
          phone: updateDto.phone,
          id: { not: organizationId },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    try {
      const updatedOrganization = await this.prisma.organization.update({
        where: { id: organizationId },
        data: updateDto,
      });

      // ✅ Mettre à jour la localisation si coordonnées modifiées
      if (updateDto.latitude || updateDto.longitude || updateDto.address) {
        const existingLocation = await this.prisma.location.findUnique({
          where: { contentId: organizationId },
        });

        if (existingLocation) {
          // Mettre à jour
          await this.locationService.update(organizationId, {
            address: updateDto.address,
            city: updateDto.city,
            region: updateDto.region,
            latitude: updateDto.latitude,
            longitude: updateDto.longitude,
          });
        } else if (updateDto.latitude && updateDto.longitude) {
          // Créer
          await this.locationService.create({
            contentType: ContentType.ORGANIZATION,
            contentId: organizationId,
            address: updatedOrganization.address,
            city: updatedOrganization.city,
            region: updatedOrganization.region,
            latitude: updateDto.latitude,
            longitude: updateDto.longitude,
          });
        }
      }

      this.logger.log(`✅ Profil mis à jour : ${updatedOrganization.name}`);

      return new OrganizationEntity(updatedOrganization as any);
    } catch (error: any) {
      this.logger.error(`❌ Erreur mise à jour profil : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour du profil');
    }
  }

  // =====================================
  // 🔑 CHANGER LE MOT DE PASSE
  // =====================================

  /**
   * Changer le mot de passe d'une organisation
   *
   * @param organizationId - ID de l'organisation
   * @param updatePasswordDto - Ancien et nouveau mot de passe
   */
  async updatePassword(
    organizationId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = updatePasswordDto;

    // ✅ Récupérer l'organisation
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      organization.password,
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
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { password: hashedPassword },
    });

    // ✅ Invalider toutes les sessions sauf la session actuelle
    // (Optionnel : vous pouvez implémenter cette logique)

    this.logger.log(`🔑 Mot de passe changé : ${organization.name}`);

    return {
      message: 'Mot de passe changé avec succès',
    };
  }

  // =====================================
  // 📋 LISTE DES ORGANISATIONS (PUBLIC)
  // =====================================

  /**
   * Liste paginée des organisations
   *
   * @param page - Numéro de page
   * @param limit - Nombre par page
   * @param type - Filtrer par type
   * @param city - Filtrer par ville
   * @param region - Filtrer par région
   * @param isVerified - Filtrer par statut vérifié
   * @param status - Filtrer par statut
   * @param search - Recherche par nom
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    type?: OrganizationType,
    city?: string,
    region?: string,
    isVerified?: boolean,
    status?: OrganizationStatus,
    search?: string,
  ) {
    // ✅ Validation pagination
    if (limit > 100) limit = 100;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    // ✅ Construction des filtres
    const where: any = {};

    // Par défaut, afficher uniquement les organisations actives et vérifiées
    if (status !== undefined) {
      where.status = status;
    } else {
      where.status = OrganizationStatus.ACTIVE;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    } else {
      where.isVerified = true; // ✅ Seulement les vérifiées par défaut
    }

    if (type) {
      where.type = type;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (region) {
      where.region = { contains: region, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ✅ Récupérer les organisations
    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isVerified: 'desc' }, // Vérifiées en premier
          { rating: 'desc' }, // Meilleures notes
          { createdAt: 'desc' }, // Plus récentes
        ],
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          phone: true,
          whatsapp: true,
          logo: true,
          coverImage: true,
          description: true,
          website: true,
          address: true,
          city: true,
          region: true,
          latitude: true,
          longitude: true,
          isVerified: true,
          emergencyAvailable: true,
          insuranceAccepted: true,
          rating: true,
          totalReviews: true,
          totalAnnouncements: true,
          totalArticles: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: organizations.map((org) => new OrganizationEntity(org as any)),
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
  // 🔍 DÉTAILS D'UNE ORGANISATION (PUBLIC)
  // =====================================

  /**
   * Récupérer les détails d'une organisation par ID
   *
   * @param id - ID de l'organisation
   */
  async findOne(id: string): Promise<OrganizationEntity> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          where: { isActive: true },
        },
        services: {
          include: {
            specialty: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Ne pas exposer les organisations non vérifiées ou supprimées au public
    if (
      !organization.isVerified ||
      organization.status === OrganizationStatus.DELETED
    ) {
      throw new NotFoundException('Organisation non trouvée');
    }

    return new OrganizationEntity(organization as any);
  }

  // =====================================
  // 👥 GESTION DES MEMBRES
  // =====================================

  /**
   * Ajouter un membre à l'organisation
   *
   * @param organizationId - ID de l'organisation
   * @param createMemberDto - Données du membre
   */
  async addMember(
    organizationId: string,
    createMemberDto: CreateMemberDto,
  ): Promise<OrganizationMemberEntity> {
    const { firstName, lastName, email, phone, position } = createMemberDto;

    // ✅ Vérifier que l'organisation existe
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // ✅ Vérifier que l'email n'existe pas déjà pour cette organisation
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'Un membre avec cet email existe déjà dans cette organisation',
      );
    }

    try {
      const member = await this.prisma.organizationMember.create({
        data: {
          organizationId,
          firstName,
          lastName,
          email,
          phone,
          position,
        },
      });

      this.logger.log(
        `✅ Membre ajouté : ${firstName} ${lastName} → ${organization.name}`,
      );

      return new OrganizationMemberEntity(member);
    } catch (error: any) {
      this.logger.error(`❌ Erreur ajout membre : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'ajout du membre");
    }
  }

  /**
   * Liste des membres d'une organisation
   *
   * @param organizationId - ID de l'organisation
   */
  async getMembers(
    organizationId: string,
  ): Promise<OrganizationMemberEntity[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return members.map(
      (member: Partial<OrganizationMemberEntity>) =>
        new OrganizationMemberEntity(member),
    );
  }

  /**
   * Mettre à jour un membre
   *
   * @param organizationId - ID de l'organisation
   * @param memberId - ID du membre
   * @param updateMemberDto - Données à mettre à jour
   */
  async updateMember(
    organizationId: string,
    memberId: string,
    updateMemberDto: UpdateMemberDto,
  ): Promise<OrganizationMemberEntity> {
    // ✅ Vérifier que le membre existe et appartient à l'organisation
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    // ✅ Si l'email change, vérifier qu'il n'est pas déjà utilisé
    if (updateMemberDto.email && updateMemberDto.email !== member.email) {
      const existingEmail = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_email: {
            organizationId,
            email: updateMemberDto.email,
          },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Cet email est déjà utilisé');
      }
    }

    try {
      const updatedMember = await this.prisma.organizationMember.update({
        where: { id: memberId },
        data: updateMemberDto,
      });

      this.logger.log(`✅ Membre mis à jour : ${updatedMember.id}`);

      return new OrganizationMemberEntity(updatedMember);
    } catch (error: any) {
      this.logger.error(`❌ Erreur mise à jour membre : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour du membre');
    }
  }

  /**
   * Supprimer un membre (soft delete via isActive)
   *
   * @param organizationId - ID de l'organisation
   * @param memberId - ID du membre
   */
  async removeMember(
    organizationId: string,
    memberId: string,
  ): Promise<{ message: string }> {
    // ✅ Vérifier que le membre existe et appartient à l'organisation
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
      },
    });

    if (!member) {
      throw new NotFoundException('Membre non trouvé');
    }

    if (!member.isActive) {
      throw new BadRequestException('Ce membre est déjà désactivé');
    }

    try {
      await this.prisma.organizationMember.update({
        where: { id: memberId },
        data: { isActive: false },
      });

      this.logger.log(`🗑️ Membre désactivé : ${memberId}`);

      return {
        message: 'Membre désactivé avec succès',
      };
    } catch (error: any) {
      this.logger.error(`❌ Erreur suppression membre : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suppression du membre');
    }
  }

  // =====================================
  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  // =====================================

  /**
   * Générer les tokens JWT
   *
   * @param organizationId - ID de l'organisation
   */
  // src/organizations/organizations.service.ts

  private async generateTokens(organizationId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Récupérer l'organisation pour obtenir l'email
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { email: true },
    });

    if (!organization) {
      throw new NotFoundException('Organisation non trouvée');
    }

    // Payload pour l'access token
    const accessPayload = {
      sub: organizationId,
      email: organization.email,
      type: 'access' as const,
    };

    // Payload pour le refresh token
    const refreshPayload = {
      sub: organizationId,
      email: organization.email,
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
   *
   * @param organizationId - ID de l'organisation
   * @param accessToken - Access token
   * @param refreshToken - Refresh token
   * @param ipAddress - Adresse IP
   * @param userAgent - User agent
   */
  private async createSession(
    organizationId: string,
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
        userType: UserType.ORGANIZATION,
        organizationId: organizationId,
        accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        deviceType: DeviceType.WEB,
        expiresAt,
      },
    });
  }

  /**
   * Convertir une durée string en millisecondes
   *
   * @param duration - Durée (ex: '7d', '15m', '1h')
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
