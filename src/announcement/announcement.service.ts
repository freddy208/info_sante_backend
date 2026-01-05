/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  QueryAnnouncementDto,
} from './dto';
import { AnnouncementEntity } from './entities';
import { AnnouncementStatus } from '@prisma/client';
import { slugify } from 'src/common/utils/slugify.util';
import { RegisterAnnouncementDto } from './dto/register-announcement.dto';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📝 CRÉER UNE ANNONCE (BROUILLON)
  // =====================================
  // Note: On crée en DRAFT, donc on ne touche PAS aux compteurs de catégories
  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    organizationId: string,
  ): Promise<AnnouncementEntity> {
    const { title, categoryId } = createAnnouncementDto;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    const baseSlug = slugify(title);
    const slug = await this.generateUniqueSlug(baseSlug);

    try {
      const announcement = await this.prisma.announcement.create({
        data: {
          ...createAnnouncementDto,
          organizationId,
          slug,
          status: AnnouncementStatus.DRAFT, // Toujours créé en brouillon
        },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(
        `Annonce créée : ${announcement.id} par ${organizationId}`,
      );
      return new AnnouncementEntity(
        this.transformAnnouncementData(announcement),
      );
    } catch (error) {
      this.logger.error(`Erreur création annonce : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création de l'annonce");
    }
  }

  // =====================================
  // 📋 LISTE PUBLIQUE (CORRIGÉ)
  // =====================================
  async findAll(query: QueryAnnouncementDto) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      organizationId,
      search,
      city,
    } = query;
    const skip = (page - 1) * limit;

    // Tableau des conditions "ET" (Doivent toutes être vraies)
    const mustMatch: any[] = [
      { status: AnnouncementStatus.PUBLISHED },
      { endDate: { gte: new Date() } }, // Pas d'événements passés
    ];

    // Filtres spécifiques (AND)
    if (categoryId) mustMatch.push({ categoryId });
    if (organizationId) mustMatch.push({ organizationId });

    // Tableau des conditions "OU" (Au moins une doit être vraie)
    const anyMatch: any[] = [];

    if (search) {
      anyMatch.push(
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      );
    }

    // ✅ CORRECTION ICI : Filtrage complexe par ville
    if (city) {
      // On veut l'annonce SOIT si l'org est dans cette ville, SOIT si l'événement est dans cette ville.
      // Prisma ne gère pas ça nativement sur un seul champ, donc on utilise une syntaxe avancée 'OR' imbriquée
      anyMatch.push(
        { organization: { city: { contains: city, mode: 'insensitive' } } },
        { location: { city: { contains: city, mode: 'insensitive' } } },
      );
    }

    // Assemblage final de la clause WHERE
    const where: any = {
      AND: mustMatch.length > 0 ? mustMatch : undefined,
      OR: anyMatch.length > 0 ? anyMatch : undefined,
    };

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          thumbnailImage: true,
          startDate: true,
          endDate: true,
          isFree: true,
          capacity: true,
          registeredCount: true,
          viewsCount: true,
          isPinned: true,
          publishedAt: true,
          organization: {
            select: { id: true, name: true, logo: true, city: true },
          },
          category: { select: { id: true, name: true, color: true } },
          location: { select: { id: true, city: true, address: true } },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: announcements.map(
        (a) => new AnnouncementEntity(this.transformAnnouncementData(a)),
      ),
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
  // 👤 MES ANNONCES (PRIVÉ)
  // =====================================
  async findMyAnnouncements(
    organizationId: string,
    query: QueryAnnouncementDto,
  ) {
    const { page = 1, limit = 20, categoryId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: announcements.map(
        (a) => new AnnouncementEntity(this.transformAnnouncementData(a)),
      ),
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
  // 🔍 DÉTAILS D'UNE ANNONCE
  // =====================================
  async findOne(
    idOrSlug: string,
    incrementView = true,
  ): Promise<AnnouncementEntity> {
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: AnnouncementStatus.PUBLISHED,
      },
      include: {
        organization: {
          select: { id: true, name: true, logo: true, phone: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        location: true,
      },
    });

    if (!announcement) {
      throw new NotFoundException('Annonce non trouvée');
    }

    // Incrémenter le compteur de vues (de manière asynchrone pour ne pas bloquer la réponse)
    if (incrementView) {
      // Incrémentation simple du compteur (pour l'affichage rapide)
      const updatePromise = this.prisma.announcement.update({
        where: { id: announcement.id },
        data: { viewsCount: { increment: 1 } },
      });

      // Création du log détaillé (Fire and forget, non bloquant)
      this.prisma.announcementView
        .create({
          data: {
            announcementId: announcement.id,
            ipAddress: '127.0.0.1',
            userAgent: 'Unknown',
          },
        })
        .catch((err) => this.logger.error(`Erreur log vue: ${err.message}`));

      await updatePromise;
    }

    return new AnnouncementEntity(
      this.transformAnnouncementData(announcement),
    );
  }

  // =====================================
  // ✏️ METTRE À JOUR UNE ANNONCE (BROUILLON SEULEMENT)
  // =====================================
  async update(
    id: string,
    updateAnnouncementDto: UpdateAnnouncementDto,
    organizationId: string,
  ): Promise<AnnouncementEntity> {
    // Vérifier que l'annonce existe et appartient à l'organisation
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, organizationId },
    });

    if (!announcement) {
      throw new NotFoundException('Annonce non trouvée ou accès refusé');
    }

    if (announcement.status === AnnouncementStatus.PUBLISHED) {
      throw new ForbiddenException(
        "Impossible de modifier une annonce publiée. Archivez-la d'abord.",
      );
    }

    // Si le titre change, régénérer le slug
    if (
      updateAnnouncementDto.title &&
      updateAnnouncementDto.title !== announcement.title
    ) {
      const baseSlug = slugify(updateAnnouncementDto.title);
      updateAnnouncementDto['slug'] = await this.generateUniqueSlug(baseSlug);
    }

    // Note: Pas de gestion de compteurs ici car on est en brouillon

    try {
      const updatedAnnouncement = await this.prisma.announcement.update({
        where: { id },
        data: updateAnnouncementDto,
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Annonce mise à jour : ${id}`);
      return new AnnouncementEntity(
        this.transformAnnouncementData(updatedAnnouncement),
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour annonce : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour');
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UNE ANNONCE (SOFT DELETE + COMPTEURS)
  // =====================================
  async remove(
    id: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    // 1. Récupérer l'annonce avec sa catégorie
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, organizationId },
      include: { category: { select: { id: true } } },
    });

    if (!announcement) {
      throw new NotFoundException('Annonce non trouvée ou accès refusé');
    }

    try {
      // 2. Transaction Atomique
      await this.prisma.$transaction(async (tx) => {
        
        // A. Marquer l'annonce comme supprimée
        await tx.announcement.update({
          where: { id },
          data: { 
            status: AnnouncementStatus.DELETED, 
            deletedAt: new Date() 
          },
        });

        // B. Si l'annonce était PUBLIÉE, on décrémente le compteur de la catégorie
        if (announcement.status === AnnouncementStatus.PUBLISHED) {
          await tx.category.update({
            where: { id: announcement.categoryId },
            data: { announcementsCount: { decrement: 1 } },
          });
        }
      });

      this.logger.log(`Annonce supprimée : ${id}`);
      return { message: 'Annonce supprimée avec succès' };
    } catch (error) {
      this.logger.error(`Erreur suppression annonce : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suppression');
    }
  }

  // =====================================
  // 📢 PUBLIER UNE ANNONCE (STATUS CHANGE + COMPTEURS)
  // =====================================
  async publish(
    id: string,
    organizationId: string,
  ): Promise<AnnouncementEntity> {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, organizationId, status: AnnouncementStatus.DRAFT },
    });

    if (!announcement) {
      throw new NotFoundException(
        'Annonce non trouvée, déjà publiée ou accès refusé',
      );
    }

    try {
      // 1. Transaction Atomique
      await this.prisma.$transaction(async (tx) => {
        
        // A. Mettre à jour l'annonce (DRAFT -> PUBLISHED)
        await tx.announcement.update({
          where: { id },
          data: {
            status: AnnouncementStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });

        // B. Incrémenter le compteur de la catégorie (DRAFT -> PUBLISHED)
        await tx.category.update({
          where: { id: announcement.categoryId },
          data: { announcementsCount: { increment: 1 } },
        });
      });

      this.logger.log(`Annonce publiée : ${id}`);
      // TODO: Déclencher l'envoi de notifications aux abonnés
      
      // 2. Relire l'annonce mise à jour pour la renvoyer au client
      const publishedAnnouncement = await this.prisma.announcement.findUnique({
        where: { id },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return new AnnouncementEntity(
        this.transformAnnouncementData(publishedAnnouncement),
      );
    } catch (error) {
      this.logger.error(`Erreur publication annonce : ${error.message}`);
      throw new BadRequestException('Erreur lors de la publication');
    }
  }

  // =====================================
  // 🔧 UTILITAIRES
  // =====================================
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 1;

    while (await this.prisma.announcement.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  private transformAnnouncementData(announcement: any): any {
    const transformed = { ...announcement };

    const nullableFields = [
      'slug',
      'excerpt',
      'thumbnailImage',
      'cost',
      'capacity',
      'publishedAt',
    ];

    nullableFields.forEach((field) => {
      if (transformed[field] === null) {
        transformed[field] = undefined;
      }
    });

    return transformed;
  }

  // =====================================
  // 📝 S'INSCRIRE À UNE ANNONCE
  // =====================================
  async register(
    announcementId: string,
    userId: string | null, // null si visiteur
    dto: RegisterAnnouncementDto,
  ): Promise<{ message: string }> {
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

    const {deviceId} = dto;

    try {
      await this.prisma.$transaction(async (tx) => {
        
        // 4. Vérification de l'unicité (User ou Device)
        let existingRegistration: any = null;

        if (userId) {
          // CAS 1 : Utilisateur Connecté
          existingRegistration = await tx.announcementRegistration.findUnique({
            where: {
              announcementId_userId: {
                announcementId,
                userId,
              },
            },
          });
        } else {
          // CAS 2 : Visiteur (Appareil)
          existingRegistration = await tx.announcementRegistration.findUnique({
            where: {
              announcementId_deviceId: {
                announcementId,
                deviceId,
              },
            },
          });
        }

        // 5. Si déjà inscrit, on bloque
        if (existingRegistration) {
          throw new BadRequestException(
            userId 
              ? "Vous êtes déjà inscrit à cette campagne."
              : "Cet appareil est déjà inscrit à cette campagne.",
          );
        }

        // 6. Créer l'inscription
        await tx.announcementRegistration.create({
          data: {
            announcementId,
            userId,
            deviceId: userId ? null : deviceId,
            visitorName: dto.visitorName,
            visitorPhone: dto.visitorPhone,
            visitorEmail: dto.visitorEmail,
            status: 'CONFIRMED',
          },
        });

        // 7. Incrémenter le compteur sur l'annonce
        await tx.announcement.update({
          where: { id: announcementId },
          data: { registeredCount: { increment: 1 } },
        });
      });

      this.logger.log(`Nouvelle inscription pour l'annonce ${announcementId}`);
      return { message: 'Inscription réussie !' };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'Une inscription existe déjà pour ce profil ou cet appareil.',
        );
      }

      this.logger.error(`Erreur inscription : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'inscription");
    }
  }
}