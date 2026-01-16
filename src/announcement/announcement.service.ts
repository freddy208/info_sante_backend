/* eslint-disable @typescript-eslint/no-unsafe-return */

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
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  QueryAnnouncementDto,
} from './dto';
import { AnnouncementEntity } from './entities';
import { AnnouncementStatus, Prisma } from '@prisma/client';
import { slugify } from 'src/common/utils/slugify.util';
import { RegisterAnnouncementDto } from './dto/register-announcement.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);
  private readonly VIEWS_CACHE_PREFIX = 'announcement_views:';
  private readonly VIEWS_BATCH_THRESHOLD = 10;

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  // =====================================
  // 📝 CRÉER UNE ANNONCE (BROUILLON)
  // =====================================
  async create(createAnnouncementDto: CreateAnnouncementDto, organizationId: string): Promise<AnnouncementEntity> {
    const { title, categoryId } = createAnnouncementDto;

    const category = await this.prisma.category.findUnique({ where: { id: categoryId, isActive: true } });
    if (!category) throw new NotFoundException('Catégorie non trouvée ou inactive');

    const slug = await this.generateUniqueSlug(slugify(title));

    try {
      const announcement = await this.prisma.announcement.create({
        data: { ...createAnnouncementDto, organizationId, slug, status: AnnouncementStatus.PUBLISHED },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });
      this.logger.log(`Annonce créée : ${announcement.id} par ${organizationId}`);
      return new AnnouncementEntity(this.transformAnnouncementData(announcement));
    } catch (error) {
      this.logger.error(`Erreur création annonce : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création de l'annonce");
    }
  }

  // =====================================
  // ✏️ METTRE À JOUR
  // =====================================
  async update(id: string, dto: UpdateAnnouncementDto, organizationId: string): Promise<AnnouncementEntity> {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Annonce non trouvée');
    if (announcement.organizationId !== organizationId) throw new ForbiddenException('Action non autorisée');

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { ...dto },
      include: {
        organization: { select: { id: true, name: true, logo: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    return new AnnouncementEntity(this.transformAnnouncementData(updated));
  }

  // =====================================
  // 📢 PUBLIER
  // =====================================
  async publish(id: string, organizationId: string): Promise<AnnouncementEntity> {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Annonce non trouvée');
    if (announcement.organizationId !== organizationId) throw new ForbiddenException('Action non autorisée');

    const published = await this.prisma.announcement.update({
      where: { id },
      data: { status: AnnouncementStatus.PUBLISHED, publishedAt: new Date() },
      include: {
        organization: { select: { id: true, name: true, logo: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    return new AnnouncementEntity(this.transformAnnouncementData(published));
  }

  // =====================================
  // 🗑️ SUPPRIMER
  // =====================================
  async remove(id: string, organizationId: string): Promise<{ message: string }> {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Annonce non trouvée');
    if (announcement.organizationId !== organizationId) throw new ForbiddenException('Action non autorisée');

    await this.prisma.announcement.delete({ where: { id } });
    return { message: 'Annonce supprimée avec succès' };
  }

  // =====================================
  // 📝 S'INSCRIRE
  // =====================================
  async register(id: string, userId: string | null, dto: RegisterAnnouncementDto): Promise<{ message: string }> {
    const announcement = await this.prisma.announcement.findUnique({ where: { id } });
    if (!announcement) throw new NotFoundException('Annonce non trouvée');
    if (announcement.status !== AnnouncementStatus.PUBLISHED) throw new BadRequestException('Annonce non publiée');

    await this.prisma.announcementRegistration.create({
      data: { announcementId: id, userId, ...dto },
    });

    return { message: 'Inscription réussie' };
  }

  // =====================================
  // 📋 LISTE PUBLIQUE
  // =====================================
  async findAll(query: QueryAnnouncementDto) {
    const { page = 1, limit = 20, categoryId, organizationId, search, city, isFree, hasCapacity } = query;
    const skip = (page - 1) * limit;

    const mustMatch: any[] = [{ status: AnnouncementStatus.PUBLISHED }, { endDate: { gte: new Date() } }];
    if (categoryId) mustMatch.push({ categoryId });
    if (organizationId) mustMatch.push({ organizationId });
    if (isFree !== undefined) mustMatch.push({ isFree: isFree === 'true' || isFree === true });
    if (hasCapacity !== undefined) mustMatch.push({
      AND: [
        { capacity: { not: null } },
        { registeredCount: { lt: Prisma.raw('capacity') } },
      ],
    });

    const anyMatch: any[] = [];
    if (search) anyMatch.push({ title: { contains: search, mode: 'insensitive' } }, { content: { contains: search, mode: 'insensitive' } });
    if (city) anyMatch.push({ organization: { city: { contains: city, mode: 'insensitive' } } }, { location: { city: { contains: city, mode: 'insensitive' } } });

    const where: any = {};
    if (mustMatch.length) where.AND = mustMatch;
    if (anyMatch.length) where.AND = [...(where.AND || []), { OR: anyMatch }];

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        select: {
          id: true, title: true, slug: true, excerpt: true, featuredImage: true, thumbnailImage: true,
          startDate: true, endDate: true, isFree: true, cost: true, capacity: true, registeredCount: true,
          viewsCount: true, isPinned: true, publishedAt: true,
          organization: { select: { id: true, name: true, logo: true, city: true } },
          category: { select: { id: true, name: true, color: true } },
          location: { select: { id: true, city: true, address: true } },
        },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const enrichedAnnouncements = await Promise.all(
      announcements.map(async (a) => ({
        ...a,
        viewsCount: a.viewsCount + (await this.getCachedViews(a.id)),
      })),
    );

    const totalPages = Math.ceil(total / limit);
    return {
      data: enrichedAnnouncements.map(a => new AnnouncementEntity(this.transformAnnouncementData(a))),
      meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }

  // =====================================
  // 👤 MES ANNONCES (PRIVÉ)
  // =====================================
  async findMyAnnouncements(organizationId: string, query: QueryAnnouncementDto) {
    const { page = 1, limit = 20, categoryId, status, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];

    const [announcements, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: announcements.map(a => new AnnouncementEntity(this.transformAnnouncementData(a))),
      meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
    };
  }

  // =====================================
  // 🔍 DÉTAILS D'UNE ANNONCE
  // =====================================
  async findOne(idOrSlug: string, incrementView = true): Promise<AnnouncementEntity> {
    const announcement = await this.prisma.announcement.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: AnnouncementStatus.PUBLISHED },
      include: {
        organization: { select: { id: true, name: true, logo: true, phone: true } },
        category: { select: { id: true, name: true, slug: true } },
        location: true,
      },
    });

    if (!announcement) throw new NotFoundException('Annonce non trouvée');

    if (incrementView) {
      this.incrementViewInCache(announcement.id).catch(err => this.logger.error(`Erreur incrémentation cache: ${err.message}`));
      this.prisma.announcementView.create({ data: { announcementId: announcement.id, ipAddress: '127.0.0.1', userAgent: 'Unknown' } })
        .catch(err => this.logger.error(`Erreur log vue: ${err.message}`));
    }

    const totalViews = announcement.viewsCount + (await this.getCachedViews(announcement.id));
    return new AnnouncementEntity(this.transformAnnouncementData({ ...announcement, viewsCount: totalViews }));
  }

  // =====================================
  // 🔴 GESTION DES VUES AVEC REDIS
  // =====================================
  private async incrementViewInCache(announcementId: string) {
    const cacheKey = `${this.VIEWS_CACHE_PREFIX}${announcementId}`;
    try {
      const currentCount = (await this.cacheManager.get<number>(cacheKey)) || 0;
      const newCount = currentCount + 1;
      await this.cacheManager.set(cacheKey, newCount, 86400); // TTL 24h
      if (newCount >= this.VIEWS_BATCH_THRESHOLD) await this.syncViewsToDatabase(announcementId, newCount);
    } catch (error: any) {
      this.logger.error(`Erreur incrémentation cache pour ${announcementId}: ${error.message}`);
    }
  }

  private async getCachedViews(announcementId: string) {
    return (await this.cacheManager.get<number>(`${this.VIEWS_CACHE_PREFIX}${announcementId}`)) || 0;
  }

  // src/announcement/announcement.service.ts

private async syncViewsToDatabase(announcementId: string, cachedCount: number) {
    const cacheKey = `${this.VIEWS_CACHE_PREFIX}${announcementId}`;
    try {
      // ✅ CORRECTION 1 : Incrémenter le bon compteur
      const data = { viewsCount: { increment: cachedCount } };

      // ✅ CORRECTION 2 : Utiliser this.prisma (le service est appelé hors transaction transactionnelle globale ici)
      await this.prisma.announcement.update({
        where: { id: announcementId },
        data,
      });
      
      // ✅ CORRECTION 3 : Supprimer la clé du cache seulement après le succès en DB
      await this.cacheManager.del(cacheKey);
      
      this.logger.log(`✅ ${cachedCount} vues synchronisées en DB pour l'annonce ${announcementId}`);
    } catch (error: any) {
      this.logger.error(`Erreur sync vues pour ${announcementId}: ${error.message}`);
    }
  }
  
@Cron(CronExpression.EVERY_HOUR)
  async syncAllViewsToDatabase() {
    this.logger.log('🔄 Début synchronisation des vues (CRON)');
    try {
      // On récupère le store interne (souvent nécessaire pour .keys())
      const store = this.cacheManager as any;
      
      // On cherche la méthode keys sur le store ou le manager
      const keysMethod = store.keys || (store.store && store.store.keys);

      if (!keysMethod) {
        this.logger.warn('Le store de cache actuel ne supporte pas la récupération des clés.');
        return;
      }

      // Récupération des clés correspondant au préfixe
      const keys: string[] = await keysMethod(`${this.VIEWS_CACHE_PREFIX}*`);

      for (const key of keys) {
        const announcementId = key.replace(this.VIEWS_CACHE_PREFIX, '');
        const cachedCount = await this.cacheManager.get<number>(key);
        
        if (cachedCount && cachedCount > 0) {
          await this.syncViewsToDatabase(announcementId, cachedCount);
        }
      }
      this.logger.log(`✅ Synchronisation terminée (${keys.length} annonces)`);
    } catch (error: any) {
      this.logger.error(`Erreur CRON sync vues: ${error.message}`);
    }
  }

  // =====================================
  // ✏️ UTILITAIRES
  // =====================================
  private async generateUniqueSlug(baseSlug: string) {
    let slug = baseSlug, suffix = 1;
    while (await this.prisma.announcement.findUnique({ where: { slug } })) slug = `${baseSlug}-${suffix++}`;
    return slug;
  }

  private transformAnnouncementData(a: any) {
    const t = { ...a };
    ['slug', 'excerpt', 'thumbnailImage', 'cost', 'capacity', 'publishedAt'].forEach(f => { if (t[f] === null) t[f] = undefined; });
    return t;
  }

  private computeHasCapacity(a: any) {
    return a.capacity != null && a.registeredCount < a.capacity;
  }
}
