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

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📋 LISTE DES UTILISATEURS (ADMIN)
  // =====================================

  /**
   * Récupérer la liste des utilisateurs avec pagination
   *
   * 🤔 POURQUOI LA PAGINATION ?
   * Si vous avez 10 000 utilisateurs, vous ne pouvez pas tous les charger d'un coup.
   * La pagination permet de charger par "pages" (ex: 10, 20, 50 utilisateurs à la fois).
   *
   * @param page - Numéro de la page (commence à 1)
   * @param limit - Nombre d'utilisateurs par page
   * @param status - Filtrer par statut (optionnel)
   * @param search - Rechercher par email, nom (optionnel)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: UserStatus,
    search?: string,
  ) {
    // ✅ Validation des paramètres
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10; // Max 100 par page

    // Calcul du skip (nombre d'éléments à sauter)
    // Ex: page 3, limit 10 → skip 20 (on saute les 20 premiers)
    const skip = (page - 1) * limit;

    // Construction du filtre WHERE de Prisma
    const where: any = {};

    // Filtrer par statut si fourni
    if (status) {
      where.status = status;
    }

    // Recherche par email, firstName ou lastName
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } }, // insensitive = case insensitive
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 🔍 Récupérer les utilisateurs ET le total (pour la pagination)
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Les plus récents en premier
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
      this.prisma.user.count({ where }), // Compte total pour la pagination
    ]);

    // Transformer en UserEntity (exclut les champs sensibles)
    const userEntities = users.map((user) => new UserEntity(user));

    // Calculer les métadonnées de pagination
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      data: userEntities,
      meta: {
        total, // Nombre total d'utilisateurs
        page, // Page actuelle
        limit, // Limite par page
        totalPages, // Nombre total de pages
        hasNextPage, // Y a-t-il une page suivante ?
        hasPreviousPage, // Y a-t-il une page précédente ?
      },
    };
  }

  // =====================================
  // 🔍 DÉTAILS D'UN UTILISATEUR (ADMIN)
  // =====================================

  /**
   * Récupérer les détails d'un utilisateur par ID
   *
   * @param id - UUID de l'utilisateur
   */
  async findOne(id: string): Promise<UserEntity> {
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

    // ❌ Vérifier que l'utilisateur existe
    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    return new UserEntity(user);
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

  // =====================================
  // 🔐 CHANGER SON MOT DE PASSE
  // =====================================

  /**
   * Changer le mot de passe de l'utilisateur connecté
   *
   * 🤔 SÉCURITÉ IMPORTANTE :
   * 1. Vérifier l'ancien mot de passe (pas juste le token JWT)
   * 2. Vérifier que le nouveau mot de passe est différent de l'ancien
   * 3. Hasher le nouveau mot de passe
   *
   * @param userId - ID de l'utilisateur connecté
   * @param updatePasswordDto - Ancien et nouveau mot de passe
   */
  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = updatePasswordDto;

    // 🔍 Récupérer l'utilisateur avec son mot de passe
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        password: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // ✅ Vérifier le statut
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        "Impossible de modifier le mot de passe d'un compte inactif",
      );
    }

    // ✅ Vérifier l'ancien mot de passe
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    // ✅ Vérifier que le nouveau mot de passe est différent
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException(
        "Le nouveau mot de passe doit être différent de l'ancien",
      );
    }

    // 🔐 Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // 💾 Mettre à jour le mot de passe
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    this.logger.log(`✅ Mot de passe changé : ${user.email}`);

    return {
      message: 'Mot de passe modifié avec succès',
    };
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
