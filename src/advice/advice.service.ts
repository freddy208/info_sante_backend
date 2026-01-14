/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */

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
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateAdviceDto,
  UpdateAdviceDto,
  QueryAdviceDto,
} from './dto';
import { AdviceEntity } from './entities';
import { AdviceStatus, Priority, TargetAudience } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager_1 from 'cache-manager'; // ✅ IMPORT CORRECT ICI
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * 💡 ADVICE SERVICE (OPTIMISÉ PRODUCTION)
 */
export class ViewAdviceResponseDto {
  message: string;
  views: number;
}
@Injectable()
export class AdviceService {
  private readonly logger = new Logger(AdviceService.name);

  private readonly VIEWS_CACHE_PREFIX = 'advice_views:';
  private readonly LIST_CACHE_PREFIX = 'advice_list:';
  private readonly VIEWS_BATCH_THRESHOLD = 10;
  private readonly LIST_CACHE_TTL = 30; // secondes

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager_1.Cache,
  ) {}

  // =====================================
  // 💡 CRÉER UN CONSEIL
  // =====================================
  async create(createAdviceDto: CreateAdviceDto, organizationId: string) {
    const { categoryId } = createAdviceDto;
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
      select: { id: true, name: true },
    });
    if (!category) throw new NotFoundException('Catégorie non trouvée');

    try {
      const advice = await this.prisma.advice.create({
        data: {
          ...createAdviceDto,
          organizationId,
          status: AdviceStatus.DRAFT,
        },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });
      this.logger.log(`Conseil créé : ${advice.id}`);
      return new AdviceEntity(this.transformAdviceData(advice));
    } catch (error) {
      this.logger.error(error.message);
      throw new BadRequestException("Erreur création conseil");
    }
  }


  // =====================================
  // 📋 LISTE PUBLIQUE (CACHE + FULL-TEXT)
  // =====================================
   // =====================================
  // 📋 LISTE PUBLIQUE (FIX CASSE SQL)
  // =====================================
async findAll(query: QueryAdviceDto) {
  const { page = 1, limit = 20, categoryId, priority, targetAudience, search, isActive } = query;
  const cacheKey = `${this.LIST_CACHE_PREFIX}${JSON.stringify(query)}`;

  const cached = await this.cacheManager.get(cacheKey);
  if (cached) return cached;

  const skip = (page - 1) * limit;
  const where: any = { status: AdviceStatus.PUBLISHED, isActive: isActive ?? true };
  if (categoryId) where.categoryId = categoryId;
  if (priority) where.priority = priority;
  if (targetAudience?.length) where.targetAudience = { hasSome: targetAudience };

  let advices: any[] = [];
  let total = 0;

  if (search) {
    // websearch_to_tsquery gère déjà la sécurité, on nettoie juste les espaces
    const searchParam = search.trim();

    // ✅ VERSION PRISMA : Pas de virgule, pas de $1, $2. On injecte directement ${var}
    advices = await this.prisma.$queryRaw<any[]>`
      SELECT 
        a."id", a."organizationId", a."categoryId", a."title", a."content", 
        a."icon", a."priority", a."targetAudience", a."viewsCount", a."sharesCount", 
        a."reactionsCount", a."isActive", a."publishedAt", a."createdAt", a."updatedAt",
        ts_rank_cd(a."search_vector", websearch_to_tsquery('french', ${searchParam})) AS rank
      FROM "advices" AS a
      WHERE a."status" = 'PUBLISHED' 
        AND a."isActive" = true
        AND a."search_vector" @@ websearch_to_tsquery('french', ${searchParam})
      ORDER BY rank DESC, a."priority" DESC, a."publishedAt" DESC
      LIMIT ${limit} OFFSET ${skip};
    `;

    const countResult = await this.prisma.$queryRaw<{ count: any }[]>`
      SELECT COUNT(*) as count FROM "advices"
      WHERE "status" = 'PUBLISHED' AND "isActive" = true
      AND "search_vector" @@ websearch_to_tsquery('french', ${searchParam});
    `;

    // PostgreSQL renvoie un BigInt, Number() ou BigInt() est nécessaire
    total = countResult[0] ? Number(countResult[0].count) : 0;
  } else {
    total = await this.prisma.advice.count({ where });
    advices = await this.prisma.advice.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
      include: {
        organization: { select: { id: true, name: true, logo: true, city: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
      },
    });
  }

  const totalPages = Math.ceil(total / limit);
  const result = {
    data: advices.map(a => new AdviceEntity(this.transformAdviceData(a))),
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };

  await this.cacheManager.set(cacheKey, result, this.LIST_CACHE_TTL * 1000);
  return result;
}

 // =====================================
  // 👤 MES CONSEILS
  // =====================================
  async findMyAdvices(organizationId: string, query: QueryAdviceDto) {
    const { page = 1, limit = 20, categoryId, status, search, priority, isActive } = query;
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
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.advice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: advices.map(a => new AdviceEntity(this.transformAdviceData(a))),
      meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }


  // =====================================
  // 🔍 DÉTAILS D'UN CONSEIL
  // =====================================
  async findOne(id: string) {
    const advice = await this.prisma.advice.findFirst({
      where: { id, status: AdviceStatus.PUBLISHED, isActive: true },
      include: { organization: { select: { id: true, name: true, logo: true, phone: true } }, category: { select: { id: true, name: true, slug: true } } },
    });
    if (!advice) throw new NotFoundException('Conseil non trouvé');

    const cachedViews = await this.getCachedViews(id);
    return new AdviceEntity({ ...this.transformAdviceData(advice), viewsCount: advice.viewsCount + cachedViews });
  }

  // =====================================
  // 👁 INCRÉMENTER LES VUES
  // =====================================
async viewAdvice(id: string): Promise<ViewAdviceResponseDto> {
  // 1. Vérifier l'existence
  const exists = await this.prisma.advice.findFirst({
    where: { id, status: AdviceStatus.PUBLISHED, isActive: true },
    select: { viewsCount: true },
  });
  if (!exists) throw new NotFoundException('Conseil non trouvé');

  const cacheKey = `${this.VIEWS_CACHE_PREFIX}${id}`;

  // 2. Récupérer la valeur actuelle du cache
  let currentCachedViews = await this.cacheManager.get<number>(cacheKey) || 0;
  
  // 3. Incrémenter localement
  const newCount = currentCachedViews + 1;

  // 4. Sauvegarder dans le cache (sans expiration pour ne pas perdre le compte avant sync)
  await this.cacheManager.set(cacheKey, newCount, 0); 

  // 5. Synchroniser si le seuil est atteint
  if (newCount >= this.VIEWS_BATCH_THRESHOLD) {
    await this.syncViewsToDatabase(id, newCount);
    // Note: syncViewsToDatabase fait déjà un cacheManager.del(cacheKey)
  }

  return { 
    message: 'Vue comptabilisée', 
    views: exists.viewsCount + (newCount >= this.VIEWS_BATCH_THRESHOLD ? 0 : newCount) 
  };
}


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

  async archive(id: string, organizationId: string): Promise<AdviceEntity> {
    const advice = await this.prisma.advice.findFirst({
      where: { id, organizationId },
    });

    if (!advice) {
      throw new NotFoundException('Conseil non trouvé ou accès refusé');
    }

    try {
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
  // 🔧 GESTION DU CACHE (CORRIGÉ POUR TS)
  // =====================================

  private async getCachedViews(id: string): Promise<number> {
    const cacheKey = `${this.VIEWS_CACHE_PREFIX}${id}`;
    return (await this.cacheManager.get<number>(cacheKey)) || 0;
  }

  private async syncViewsToDatabase(id: string, cachedCount: number) {
    const cacheKey = `${this.VIEWS_CACHE_PREFIX}${id}`;
    try {
      await this.prisma.advice.update({ where: { id }, data: { viewsCount: { increment: cachedCount } } });
      await this.cacheManager.del(cacheKey);
      this.logger.log(`✅ ${cachedCount} vues synchronisées pour ${id}`);
    } catch (error) {
      this.logger.error(`Erreur sync vues pour ${id}: ${error.message}`);
    }
  }

@Cron(CronExpression.EVERY_HOUR)
  async syncAllViewsToDatabase() {
    this.logger.log('🔄 Début sync vues (CRON)');
    const store = (this.cacheManager as any).store;

    // Si on est sur Redis, on peut lister les clés
    if (store && typeof store.keys === 'function') {
      const keys: string[] = await store.keys(`${this.VIEWS_CACHE_PREFIX}*`);
      for (const key of keys) {
        const adviceId = key.replace(this.VIEWS_CACHE_PREFIX, '');
        const cachedCount = await this.cacheManager.get<number>(key);
        if (cachedCount && cachedCount > 0) {
          await this.syncViewsToDatabase(adviceId, cachedCount);
        }
      }
      this.logger.log(`✅ Synchronisation terminée (${keys.length} conseils)`);
    } else {
      this.logger.warn('⚠️ Le store actuel ne supporte pas le listage des clés (keys()). Sync auto impossible via CRON.');
    }
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
    const nullable = ['icon', 'publishedAt', 'deletedAt', 'content'];
    nullable.forEach(f => { if (advice[f] === null) advice[f] = undefined; });
    return advice;
  }
}