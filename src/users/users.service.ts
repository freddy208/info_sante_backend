/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/users/users.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserEntity } from './entities/user.entity';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

/**
 * 👥 USERS SERVICE
 *
 * Gère toute la logique métier liée aux utilisateurs :
 * - Récupération des utilisateurs (liste, détails)
 * - Modification de profil
 * - Changement de mot de passe
 * - Suspension/Activation de compte
 * - Soft delete
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private async getCache(key: string) {
    const client = this.redisService.getClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  }

  private async setCache(key: string, value: any, ttl = 300) {
    const client = this.redisService.getClient();
    await client.set(key, JSON.stringify(value), 'EX', ttl); // TTL = 5min par défaut
  }

  // =====================
  // LISTE UTILISATEURS (ADMIN)
  // =====================
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: UserStatus,
    search?: string,
  ) {
    const cacheKey = `users:page=${page}:limit=${limit}:status=${status}:search=${search}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
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
          isEmailVerified: true,
          isPhoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userEntities = users.map((u) => new UserEntity(u));
    const totalPages = Math.ceil(total / limit);

    const result = {
      data: userEntities,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    await this.setCache(cacheKey, result); // Stockage en cache Redis
    return result;
  }

  // =====================
  // FIND ONE UTILISATEUR
  // =====================
  async findOne(id: string): Promise<UserEntity> {
    const cacheKey = `user:${id}`;
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        region: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        status: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!user) throw new NotFoundException(`Utilisateur ${id} non trouvé`);

    const entity = new UserEntity(user);
    await this.setCache(cacheKey, entity, 600); // TTL 10min
    return entity;
  }

  // =====================================
  // 👤 PROFIL DE L'UTILISATEUR CONNECTÉ
  // =====================================

  /**
   * Récupérer le profil complet de l'utilisateur connecté
   *
   * 🤔 DIFFÉRENCE avec findOne :
   * - findOne : Pour les admins qui consultent n'importe quel utilisateur
   * - getProfile : Pour l'utilisateur qui consulte SON PROPRE profil
   *
   * @param userId - ID de l'utilisateur connecté (depuis le JWT)
   */
  async getProfile(userId: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        region: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return new UserEntity(user);
  }

  // =====================================
  // ✏️ MODIFIER SON PROFIL
  // =====================================

  /**
   * Modifier le profil de l'utilisateur connecté
   *
   * 🤔 VÉRIFICATIONS DE SÉCURITÉ :
   * 1. Le téléphone n'est pas déjà utilisé par un autre
   * 2. On ne peut modifier que son propre profil
   *
   * @param userId - ID de l'utilisateur connecté
   * @param updateUserDto - Données à mettre à jour
   */
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    // ✅ Vérifier que l'utilisateur existe
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId, status: UserStatus.ACTIVE },
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // ✅ Vérifier le statut du compte
    if (existingUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Impossible de modifier un compte inactif ou suspendu',
      );
    }

    // ⚠️ VÉRIFICATION CRITIQUE : Téléphone unique
    if (updateUserDto.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      // Si le téléphone existe ET qu'il appartient à un autre utilisateur
      if (phoneExists && phoneExists.id !== userId) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    // 📝 Préparer les données à mettre à jour
    const dataToUpdate: any = {};

    // Ne mettre à jour que les champs fournis (PATCH partiel)
    if (updateUserDto.firstName !== undefined)
      dataToUpdate.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined)
      dataToUpdate.lastName = updateUserDto.lastName;
    if (updateUserDto.phone !== undefined)
      dataToUpdate.phone = updateUserDto.phone;
    if (updateUserDto.dateOfBirth !== undefined) {
      dataToUpdate.dateOfBirth = new Date(updateUserDto.dateOfBirth);
    }
    if (updateUserDto.gender !== undefined)
      dataToUpdate.gender = updateUserDto.gender;
    if (updateUserDto.city !== undefined)
      dataToUpdate.city = updateUserDto.city;
    if (updateUserDto.region !== undefined)
      dataToUpdate.region = updateUserDto.region;

    // 💾 Mettre à jour l'utilisateur
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        region: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`✅ Profil mis à jour : ${updatedUser.email}`);

    return new UserEntity(updatedUser);
  }

  // =====================
  // UPDATE PASSWORD (USER)
  // =====================
  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const { currentPassword, newPassword } = dto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: UserStatus.ACTIVE },
      select: { id: true, email: true, password: true, status: true },
    });

    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new UnauthorizedException('Mot de passe incorrect');

    if (await bcrypt.compare(newPassword, user.password))
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent de l’ancien',
      );

    const hashed = await bcrypt.hash(newPassword, 12);

    // Rate limiting simple pour protéger la route
    const redisKey = `pwd:attempts:${userId}`;
    const attempts = await this.redisService.getClient().incr(redisKey);
    if (attempts > 5) {
      throw new ForbiddenException('Trop de tentatives, réessayez dans 1h');
    }
    if (attempts === 1) {
      await this.redisService.getClient().expire(redisKey, 3600);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    this.logger.log(`Mot de passe changé : ${user.email}`);
    return { message: 'Mot de passe modifié avec succès' };
  }

  // =====================================
  // 🗑️ SOFT DELETE (ADMIN)
  // =====================================

  /**
   * Supprimer un utilisateur (soft delete)
   *
   * 🤔 SOFT DELETE = Ne pas supprimer physiquement
   * On met juste status = DELETED et deletedAt = maintenant
   *
   * AVANTAGES :
   * - ✅ Audit trail complet (on garde l'historique)
   * - ✅ Possibilité de restaurer
   * - ✅ Les relations restent intactes
   *
   * @param id - ID de l'utilisateur à supprimer
   */
  async remove(id: string): Promise<{ message: string }> {
    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    // Vérifier qu'il n'est pas déjà supprimé
    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException('Cet utilisateur est déjà supprimé');
    }

    // 💾 Soft delete (pas de .delete() !)
    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    this.logger.warn(`🗑️ Utilisateur supprimé (soft delete) : ${user.email}`);

    return {
      message: 'Utilisateur supprimé avec succès',
    };
  }

  // =====================================
  // ⛔ SUSPENDRE UN UTILISATEUR (ADMIN)
  // =====================================

  /**
   * Suspendre un compte utilisateur
   *
   * @param id - ID de l'utilisateur à suspendre
   */
  async suspend(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Cet utilisateur est déjà suspendu');
    }

    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException(
        'Impossible de suspendre un compte supprimé',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
    });

    this.logger.warn(`⛔ Utilisateur suspendu : ${user.email}`);

    return {
      message: 'Utilisateur suspendu avec succès',
    };
  }

  // =====================================
  // ✅ RÉACTIVER UN UTILISATEUR (ADMIN)
  // =====================================

  /**
   * Réactiver un compte utilisateur suspendu
   *
   * @param id - ID de l'utilisateur à réactiver
   */
  async activate(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Cet utilisateur est déjà actif');
    }

    if (user.status === UserStatus.DELETED) {
      throw new BadRequestException(
        'Impossible de réactiver un compte supprimé',
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    this.logger.log(`✅ Utilisateur réactivé : ${user.email}`);

    return {
      message: 'Utilisateur réactivé avec succès',
    };
  }
}
