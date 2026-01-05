/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  RegisterDto,
  RegisterVisitorDto,
  UpdateRegistrationDto,
  CancelRegistrationDto,
} from './dto';
import { RegistrationEntity } from './entities';
import { RegistrationStats } from './interfaces';
import { RegistrationStatus, AnnouncementStatus } from '@prisma/client';

@Injectable()
export class AnnouncementRegistrationService {
  private readonly logger = new Logger(AnnouncementRegistrationService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📝 INSCRIRE UN UTILISATEUR CONNECTÉ
  // =====================================
  async register(
    registerDto: RegisterDto,
    userId: string,
  ): Promise<RegistrationEntity> {
    const { announcementId, notes } = registerDto;

    // Vérifier que l'annonce existe et accepte les inscriptions
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement || announcement.status !== AnnouncementStatus.PUBLISHED) {
      throw new NotFoundException('Annonce non trouvée ou non publiée');
    }

    if (!announcement.requiresRegistration) {
      throw new BadRequestException(
        "Cette annonce ne nécessite pas d'inscription",
      );
    }

    // Vérifier si l'utilisateur est déjà inscrit
    const existingRegistration =
      await this.prisma.announcementRegistration.findUnique({
        where: { announcementId_userId: { announcementId, userId } },
      });

    if (existingRegistration) {
      throw new BadRequestException('Vous êtes déjà inscrit à cette annonce');
    }

    // Vérifier la capacité
    if (
      announcement.capacity &&
      announcement.registeredCount >= announcement.capacity
    ) {
      throw new BadRequestException(
        "Il n'y a plus de places disponibles pour cette annonce",
      );
    }

    try {
      const registration = await this.prisma.announcementRegistration.create({
        data: {
          announcementId,
          userId,
          notes,
          status: RegistrationStatus.PENDING,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          announcement: { select: { id: true, title: true, startDate: true } },
        },
      });

      // Incrémenter le compteur d'inscriptions
      await this.prisma.announcement.update({
        where: { id: announcementId },
        data: { registeredCount: { increment: 1 } },
      });

      // TODO: Envoyer une notification de confirmation

      this.logger.log(
        `Utilisateur ${userId} inscrit à l'annonce ${announcementId}`,
      );
      return new RegistrationEntity(
        this.transformRegistrationData(registration),
      );
    } catch (error) {
      this.logger.error(`Erreur inscription utilisateur : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'inscription");
    }
  }

  // 🌍 INSCRIRE UN VISITEUR (Appareil)
  // =====================================
  async registerVisitor(
    registerVisitorDto: RegisterVisitorDto,
  ): Promise<RegistrationEntity> {
    const {
      announcementId,
      visitorName,
      visitorEmail,
      visitorPhone,
      deviceId,
      notes,
    } = registerVisitorDto;

    // 1. Vérifier que l'annonce existe et est publiée
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement || announcement.status !== AnnouncementStatus.PUBLISHED) {
      throw new NotFoundException('Annonce introuvable ou non publiée');
    }

    // 2. Vérifier si l'inscription est requise
    if (!announcement.requiresRegistration) {
      throw new BadRequestException(
        "Cette campagne ne nécessite pas d'inscription",
      );
    }

    // 3. Vérifier la capacité
    if (
      announcement.capacity &&
      announcement.registeredCount >= announcement.capacity
    ) {
      throw new BadRequestException(
        "Désolé, il n'y a plus de places disponibles",
      );
    }

    // 4. Vérifier si le Device ID est fourni
    if (!deviceId) {
      throw new BadRequestException(
        "L'identifiant de l'appareil (deviceId) est requis pour garantir l'inscription unique.",
      );
    }

    try {
      // On stocke l'objet créé ici pour le retourner ensuite
      let createdRegistration: any = null;

      await this.prisma.$transaction(async (tx) => {
        // A. Vérifier l'existence de l'inscription (Par Appareil)
        const existingRegistration =
          await tx.announcementRegistration.findUnique({
            where: {
              announcementId_deviceId: {
                announcementId,
                deviceId,
              },
            },
          });

        // B. Si déjà inscrit, on bloque
        if (existingRegistration) {
          throw new BadRequestException(
            'Cet appareil est déjà inscrit à cette campagne.',
          );
        }

        // C. Créer l'inscription
        createdRegistration = await tx.announcementRegistration.create({
          data: {
            announcementId,
            userId: null, // Visiteur
            deviceId,
            visitorName,
            visitorEmail,
            visitorPhone,
            notes,
            status: 'CONFIRMED',
          },
        });

        // D. Incrémenter le compteur sur l'annonce
        await tx.announcement.update({
          where: { id: announcementId },
          data: { registeredCount: { increment: 1 } },
        });
      });

      this.logger.log(
        `Visiteur ${deviceId} inscrit à l'annonce ${announcementId}`,
      );

      // ✅ CORRECTION DU RETOUR : On retourne l'entité transformée
      return new RegistrationEntity(
        this.transformRegistrationData(createdRegistration),
      );
    } catch (error) {
      // Si c'est une erreur que l'on a lancée nous-même (BadRequest), on la relance
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Gestion des erreurs Prisma (ex: violation de contrainte unique)
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Une inscription existe déjà pour cet appareil.',
        );
      }

      this.logger.error(`Erreur inscription visiteur : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'inscription");
    }
  }
  // =====================================
  // 👤 MES INSCRIPTIONS
  // =====================================
  async findMyRegistrations(userId: string): Promise<RegistrationEntity[]> {
    const registrations = await this.prisma.announcementRegistration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            featuredImage: true,
          },
        },
      },
    });

    return registrations.map(
      (r) => new RegistrationEntity(this.transformRegistrationData(r)),
    );
  }

  // =====================================
  // 📋 INSCRIPTIONS POUR UNE ANNONCE (ORGANISATION)
  // =====================================
  async findByAnnouncement(announcementId: string, organizationId: string) {
    // Vérifier que l'annonce appartient à l'organisation
    const announcement = await this.prisma.announcement.findFirst({
      where: { id: announcementId, organizationId },
    });

    if (!announcement) {
      throw new NotFoundException('Annonce non trouvée ou accès refusé');
    }

    const registrations = await this.prisma.announcementRegistration.findMany({
      where: { announcementId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return {
      data: registrations.map(
        (r) => new RegistrationEntity(this.transformRegistrationData(r)),
      ),
      stats: await this.getRegistrationStats(announcementId),
    };
  }

  // =====================================
  // ✏️ METTRE À JOUR UNE INSCRIPTION (ORGANISATION)
  // =====================================
  async updateRegistration(
    id: string,
    updateRegistrationDto: UpdateRegistrationDto,
    organizationId: string,
  ): Promise<RegistrationEntity> {
    const registration = await this.prisma.announcementRegistration.findFirst({
      where: { id },
      include: { announcement: { select: { organizationId: true } } },
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    if (registration.announcement.organizationId !== organizationId) {
      throw new ForbiddenException('Accès refusé');
    }

    try {
      const updatedRegistration =
        await this.prisma.announcementRegistration.update({
          where: { id },
          data: {
            ...updateRegistrationDto,
            // Mettre à jour les dates de statut si nécessaire
            ...(updateRegistrationDto.status ===
              RegistrationStatus.CONFIRMED && { confirmedAt: new Date() }),
            ...(updateRegistrationDto.status ===
              RegistrationStatus.CANCELLED && { cancelledAt: new Date() }),
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            announcement: { select: { id: true, title: true } },
          },
        });

      this.logger.log(
        `Inscription ${id} mise à jour par l'organisation ${organizationId}`,
      );
      return new RegistrationEntity(
        this.transformRegistrationData(updatedRegistration),
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour inscription : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour');
    }
  }

  // =====================================
  // ❌ ANNULER UNE INSCRIPTION (UTILISATEUR)
  // =====================================
  async cancelRegistration(
    id: string,
    cancelRegistrationDto: CancelRegistrationDto,
    userId: string,
  ): Promise<{ message: string }> {
    const registration = await this.prisma.announcementRegistration.findFirst({
      where: { id, userId },
    });

    if (!registration) {
      throw new NotFoundException('Inscription non trouvée');
    }

    if (
      registration.status !== RegistrationStatus.PENDING &&
      registration.status !== RegistrationStatus.CONFIRMED
    ) {
      throw new BadRequestException("Impossible d'annuler cette inscription");
    }

    try {
      await this.prisma.announcementRegistration.update({
        where: { id },
        data: {
          status: RegistrationStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: cancelRegistrationDto.cancellationReason,
        },
      });

      // Décrémenter le compteur
      await this.prisma.announcement.update({
        where: { id: registration.announcementId },
        data: { registeredCount: { decrement: 1 } },
      });

      this.logger.log(`Inscription ${id} annulée par l'utilisateur ${userId}`);
      return { message: 'Inscription annulée avec succès' };
    } catch (error) {
      this.logger.error(`Erreur annulation inscription : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'annulation");
    }
  }

  // =====================================
  // 📊 STATISTIQUES D'INSCRIPTION
  // =====================================
  async getRegistrationStats(
    announcementId: string,
  ): Promise<RegistrationStats> {
    const stats = await this.prisma.announcementRegistration.groupBy({
      by: ['status'],
      where: { announcementId },
      _count: { status: true },
    });

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { capacity: true, registeredCount: true },
    });

    const total = announcement?.registeredCount || 0;
    const capacity = announcement?.capacity || null;

    const result = {
      total,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      attended: 0,
      remainingCapacity: capacity ? Math.max(0, capacity - total) : 999, // Infini si pas de capacité
    };

    stats.forEach((stat) => {
      result[stat.status.toLowerCase() as keyof RegistrationStats] =
        stat._count.status;
    });

    return result;
  }

  // =====================================
  // 🔧 UTILITAIRES
  // =====================================
  private transformRegistrationData(registration: any): any {
    const transformed = { ...registration };
    // Les champs peuvent être null, mais l'entité attend undefined
    const nullableFields = [
      'userId',
      'visitorName',
      'visitorEmail',
      'visitorPhone',
      'confirmedAt',
      'cancelledAt',
      'cancellationReason',
      'attendedAt',
      'notes',
    ];
    nullableFields.forEach((field) => {
      if (transformed[field] === null) {
        transformed[field] = undefined;
      }
    });
    return transformed;
  }
}
