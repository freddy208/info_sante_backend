/* eslint-disable @typescript-eslint/no-unused-vars */
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
  CreateAdviceDto,
  UpdateAdviceDto,
  QueryAdviceDto,
} from './dto';
import { AdviceEntity } from './entities';
import { AdviceStatus, Priority, TargetAudience } from '@prisma/client';

/**
 * 💡 ADVICE SERVICE
 */
@Injectable()
export class AdviceService {
  private readonly logger = new Logger(AdviceService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 💡 CRÉER UN CONSEIL
  // =====================================
  async create(
    createAdviceDto: CreateAdviceDto,
    organizationId: string,
  ): Promise<AdviceEntity> {
    const { title, categoryId } = createAdviceDto;

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    try {
      const advice = await this.prisma.advice.create({
        data: {
          ...createAdviceDto,
          organizationId,
          status: AdviceStatus.DRAFT, // Toujours créé en brouillon
        },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Conseil créé : ${advice.id} par ${organizationId}`);
      return new AdviceEntity(this.transformAdviceData(advice));
    } catch (error) {
      this.logger.error(`Erreur création conseil : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création du conseil");
    }
  }

  // =====================================
  // 📋 LISTE PUBLIQUE (OPTIMISÉE)
  // =====================================
  async findAll(query: QueryAdviceDto) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      organizationId,
      search,
      priority,
      targetAudience,
      isActive,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: AdviceStatus.PUBLISHED,
      isActive: isActive !== undefined ? isActive : true,
    };

    if (categoryId) where.categoryId = categoryId;
    if (organizationId) where.organizationId = organizationId;
    if (priority) where.priority = priority;
    if (targetAudience && targetAudience.length > 0) {
      where.targetAudience = { hasSome: targetAudience };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [advices, total] = await Promise.all([
      this.prisma.advice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
        // OPTIMISATION CRITIQUE : Select explicite pour exclure le 'content'
        select: {
          id: true,
          title: true,
          icon: true,
          priority: true,
          targetAudience: true,
          viewsCount: true,
          reactionsCount: true,
          sharesCount: true,
          isActive: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: { id: true, name: true, logo: true, city: true },
          },
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
        },
      }),
      this.prisma.advice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: advices.map((a) => new AdviceEntity(this.transformAdviceData(a))),
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
  // 👤 MES CONSEILS (PRIVÉ)
  // =====================================
  async findMyAdvices(organizationId: string, query: QueryAdviceDto) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      status,
      search,
      priority,
      isActive,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [advices, total] = await Promise.all([
      this.prisma.advice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          icon: true,
          status: true,
          isActive: true,
          publishedAt: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.advice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: advices.map((a) => new AdviceEntity(this.transformAdviceData(a))),
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
  // 🔍 DÉTAILS D'UN CONSEIL (LECTURE SEULE - GET)
  // =====================================
  async findOne(id: string): Promise<AdviceEntity> {
    // ✅ BONNE PRATIQUE : Cette méthode ne fait QUE lire (GET)
    // Elle ne modifie PAS la base de données.
    const advice = await this.prisma.advice.findFirst({
      where: {
        id,
        status: AdviceStatus.PUBLISHED,
        isActive: true,
      },
      include: {
        organization: {
          select: { id: true, name: true, logo: true, phone: true },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé');
    }

    return new AdviceEntity(this.transformAdviceData(advice));
  }

  // =====================================
  // 👁 INCRÉMENTER LES VUES (ÉCRITURE - PATCH)
  // =====================================
  // ✅ NOUVEAU : Méthode explicite pour gérer les vues
  async viewAdvice(id: string): Promise<AdviceEntity> {
    // 1. Vérifier que le conseil existe
    const advice = await this.prisma.advice.findFirst({
      where: { id, status: AdviceStatus.PUBLISHED, isActive: true },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé');
    }

    // 2. Incrémenter le compteur
    try {
      await this.prisma.advice.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      });
    } catch (error) {
      this.logger.error(`Erreur incrémentation vue: ${error.message}`);
    }

    // 3. Retourner l'objet mis à jour (utile pour le cache du Frontend)
    const updatedAdvice = await this.prisma.advice.findFirst({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, logo: true, phone: true },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return new AdviceEntity(this.transformAdviceData(updatedAdvice));
  }

  // =====================================
  // ✏️ METTRE À JOUR UN CONSEIL
  // =====================================
  async update(
    id: string,
    updateAdviceDto: UpdateAdviceDto,
    organizationId: string,
  ): Promise<AdviceEntity> {
    const advice = await this.prisma.advice.findFirst({
      where: { id, organizationId },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé ou accès refusé');
    }

    if (advice.status === AdviceStatus.PUBLISHED) {
      throw new ForbiddenException(
        "Impossible de modifier un conseil publié. Archivez-le d'abord.",
      );
    }

    try {
      const updatedAdvice = await this.prisma.advice.update({
        where: { id },
        data: updateAdviceDto,
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Conseil mis à jour : ${id}`);
      return new AdviceEntity(this.transformAdviceData(updatedAdvice));
    } catch (error) {
      this.logger.error(`Erreur mise à jour conseil : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour');
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UN CONSEIL
  // =====================================
  async remove(
    id: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    const advice = await this.prisma.advice.findFirst({
      where: { id, organizationId },
      include: { category: { select: { id: true } } },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé ou accès refusé');
    }

    try {
      // Transaction Atomique
      await this.prisma.$transaction(async (tx) => {
        await tx.advice.update({
          where: { id },
          data: { status: AdviceStatus.DELETED, deletedAt: new Date() },
        });

        if (advice.status === AdviceStatus.PUBLISHED) {
          await tx.category.update({
            where: { id: advice.categoryId },
            data: { advicesCount: { decrement: 1 } },
          });
        }
      });

      this.logger.log(`Conseil supprimé : ${id}`);
      return { message: 'Conseil supprimé avec succès' };
    } catch (error) {
      this.logger.error(`Erreur suppression conseil : ${error.message}`);
      throw new BadRequestException("Erreur lors de la suppression");
    }
  }

  // =====================================
  // 📢 PUBLIER UN CONSEIL
  // =====================================
  async publish(id: string, organizationId: string): Promise<AdviceEntity> {
    const advice = await this.prisma.advice.findFirst({
      where: { id, organizationId, status: AdviceStatus.DRAFT },
    });

    if (!advice) {
      throw new NotFoundException(
        'Conseil non trouvé, déjà publié ou accès refusé',
      );
    }

    try {
      // Transaction Atomique
      await this.prisma.$transaction(async (tx) => {
        await tx.advice.update({
          where: { id },
          data: {
            status: AdviceStatus.PUBLISHED,
            publishedAt: new Date(),
            isActive: true,
          },
        });

        await tx.category.update({
          where: { id: advice.categoryId },
          data: { advicesCount: { increment: 1 } },
        });
      });

      this.logger.log(`Conseil publié : ${id}`);

      const publishedAdvice = await this.prisma.advice.findUnique({
        where: { id },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return new AdviceEntity(this.transformAdviceData(publishedAdvice));
    } catch (error) {
      this.logger.error(`Erreur publication conseil : ${error.message}`);
      throw new BadRequestException("Erreur lors de la publication");
    }
  }

  // =====================================
  // 📊 ARCHIVER UN CONSEIL
  // =====================================
  async archive(id: string, organizationId: string): Promise<AdviceEntity> {
    const advice = await this.prisma.advice.findFirst({
      where: { id, organizationId },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé ou accès refusé');
    }

    try {
      // Transaction Atomique
      await this.prisma.$transaction(async (tx) => {
        await tx.advice.update({
          where: { id },
          data: {
            status: AdviceStatus.ARCHIVED,
            isActive: false,
          },
        });

        if (advice.status === AdviceStatus.PUBLISHED) {
          await tx.category.update({
            where: { id: advice.categoryId },
            data: { advicesCount: { decrement: 1 } },
          });
        }
      });

      this.logger.log(`Conseil archivé : ${id}`);

      const archivedAdvice = await this.prisma.advice.findUnique({
        where: { id },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return new AdviceEntity(this.transformAdviceData(archivedAdvice));
    } catch (error) {
      this.logger.error(`Erreur archivage conseil : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'archivage");
    }
  }

  // =====================================
  // 🔄 CHANGER LA PRIORITÉ
  // =====================================
  async updatePriority(
    id: string,
    organizationId: string,
    priority: Priority,
  ): Promise<AdviceEntity> {
    const advice = await this.prisma.advice.findFirst({
      where: { id, organizationId },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé ou accès refusé');
    }

    try {
      const updatedAdvice = await this.prisma.advice.update({
        where: { id },
        data: { priority },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Priorité du conseil mise à jour : ${id} -> ${priority}`);
      return new AdviceEntity(this.transformAdviceData(updatedAdvice));
    } catch (error) {
      this.logger.error(`Erreur mise à jour priorité conseil : ${error.message}`);
      throw new BadRequestException("Erreur lors de la mise à jour");
    }
  }

  // =====================================
  // 📊 STATISTIQUES DES CONSEILS
  // =====================================
  async getAdviceStats(organizationId?: string): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    byPriority: Record<Priority, number>;
    totalViews: number;
    totalReactions: number;
    totalShares: number;
    byAudience: Record<TargetAudience, number>;
  }> {
    const where = organizationId ? { organizationId } : {};

    const [
      total,
      published,
      draft,
      archived,
      byPriority,
      byAudience,
      totalViews,
      totalReactions,
      totalShares,
    ] = await Promise.all([
      this.prisma.advice.count({ where }),
      this.prisma.advice.count({
        where: { ...where, status: AdviceStatus.PUBLISHED },
      }),
      this.prisma.advice.count({
        where: { ...where, status: AdviceStatus.DRAFT },
      }),
      this.prisma.advice.count({
        where: { ...where, status: AdviceStatus.ARCHIVED },
      }),
      this.prisma.advice.groupBy({
        by: ['priority'],
        where,
        _count: { priority: true },
      }),
      this.getAdviceByAudience(where),
      this.prisma.advice.aggregate({
        where,
        _sum: { viewsCount: true },
      }),
      this.prisma.advice.aggregate({
        where,
        _sum: { reactionsCount: true },
      }),
      this.prisma.advice.aggregate({
        where,
        _sum: { sharesCount: true },
      }),
    ]);

    const byPriorityData = byPriority.reduce(
      (acc, item) => {
        acc[item.priority] = item._count.priority;
        return acc;
      },
      {} as Record<Priority, number>,
    );

    Object.values(Priority).forEach((priority) => {
      if (!byPriorityData[priority]) {
        byPriorityData[priority] = 0;
      }
    });

    return {
      total,
      published,
      draft,
      archived,
      byPriority: byPriorityData,
      totalViews: totalViews?._sum?.viewsCount || 0,
      totalReactions: totalReactions?._sum?.reactionsCount || 0,
      totalShares: totalShares?._sum?.sharesCount || 0,
      byAudience: byAudience,
    };
  }

  // =====================================
  // 🔧 UTILITAIRES PRIVÉS
  // =====================================

  private async getAdviceByAudience(
    where: any,
  ): Promise<Record<TargetAudience, number>> {
    const advices = await this.prisma.advice.findMany({
      where,
      select: { targetAudience: true },
    });

    const byAudience = advices.reduce(
      (acc, advice) => {
        advice.targetAudience.forEach((audience) => {
          acc[audience] = (acc[audience] || 0) + 1;
        });
        return acc;
      },
      {} as Record<TargetAudience, number>,
    );

    Object.values(TargetAudience).forEach((audience) => {
      if (!byAudience[audience]) {
        byAudience[audience] = 0;
      }
    });

    return byAudience;
  }

  private transformAdviceData(advice: any): any {
    const transformed = { ...advice };
    const nullableFields = [
      'icon',
      'publishedAt',
      'deletedAt',
      'content',
    ];

    nullableFields.forEach((field) => {
      if (transformed[field] === null) {
        transformed[field] = undefined;
      }
    });

    return transformed;
  }
}