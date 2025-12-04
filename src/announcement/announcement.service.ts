/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📝 CRÉER UNE ANNONCE
  // =====================================
  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    organizationId: string,
  ): Promise<AnnouncementEntity> {
    const { title, categoryId } = createAnnouncementDto;

    // Vérifier que la catégorie existe
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    // Générer un slug unique
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
      // Transformer les données avant de les passer à l'entité
      return new AnnouncementEntity(
        this.transformAnnouncementData(announcement),
      );
    } catch (error) {
      this.logger.error(`Erreur création annonce : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création de l'annonce");
    }
  }

  // =====================================
  // 📋 LISTE PUBLIQUE
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

    const where: any = {
      status: AnnouncementStatus.PUBLISHED,
      endDate: { gte: new Date() }, // Ne pas montrer les événements passés
    };

    if (categoryId) where.categoryId = categoryId;
    if (organizationId) where.organizationId = organizationId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) {
      where.organization = { city: { contains: city, mode: 'insensitive' } };
    }

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
          location: true,
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
        status: AnnouncementStatus.PUBLISHED, // Seul le contenu publié est visible publiquement
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
      this.prisma.announcement
        .update({
          where: { id: announcement.id },
          data: { viewsCount: { increment: 1 } },
        })
        .catch((err) =>
          this.logger.error(`Erreur incrémentation vue: ${err.message}`),
        );

      // TODO: Créer un enregistrement dans AnnouncementView pour plus de détails
    }

    // Transformer les données avant de les passer à l'entité
    return new AnnouncementEntity(this.transformAnnouncementData(announcement));
  }

  // =====================================
  // ✏️ METTRE À JOUR UNE ANNONCE
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
      // Transformer les données avant de les passer à l'entité
      return new AnnouncementEntity(
        this.transformAnnouncementData(updatedAnnouncement),
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour annonce : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour');
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UNE ANNONCE (SOFT DELETE)
  // =====================================
  async remove(
    id: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, organizationId },
    });

    if (!announcement) {
      throw new NotFoundException('Annonce non trouvée ou accès refusé');
    }

    await this.prisma.announcement.update({
      where: { id },
      data: { status: AnnouncementStatus.DELETED, deletedAt: new Date() },
    });

    this.logger.log(`Annonce supprimée : ${id}`);
    return { message: 'Annonce supprimée avec succès' };
  }

  // =====================================
  // 📢 PUBLIER UNE ANNONCE
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

    const publishedAnnouncement = await this.prisma.announcement.update({
      where: { id },
      data: {
        status: AnnouncementStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        organization: { select: { id: true, name: true, logo: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.log(`Annonce publiée : ${id}`);
    // TODO: Déclencher l'envoi de notifications aux abonnés
    // Transformer les données avant de les passer à l'entité
    return new AnnouncementEntity(
      this.transformAnnouncementData(publishedAnnouncement),
    );
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

  /**
   * Transforme les données de Prisma pour les rendre compatibles avec l'entité
   */
  private transformAnnouncementData(announcement: any): any {
    // Créer une copie pour éviter de modifier l'original
    const transformed = { ...announcement };

    // Convertir les valeurs null en undefined pour les champs optionnels
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
}
