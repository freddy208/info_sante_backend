/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prefer-const */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateBookmarkDto, QueryBookmarkDto } from './dto';
import { BookmarkEntity } from './entities';
import {
  ContentType,
  AnnouncementStatus,
  ArticleStatus,
  AdviceStatus,
} from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';

@Injectable()
export class BookmarkService {
  private readonly logger = new Logger(BookmarkService.name);

  // ✅ PERFORMANCE : Configuration Cache (Durée de vie courte car les favoris changent souvent)
  private readonly BOOKMARK_LIST_CACHE_PREFIX = 'user_bookmarks:';
  private readonly BOOKMARK_LIST_CACHE_TTL = 300; // 5 minutes

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  // =====================================
  // 🔖 AJOUTER UN FAVORI
  // =====================================
  async create(
    createBookmarkDto: CreateBookmarkDto,
    userId: string,
  ): Promise<BookmarkEntity> {
    const { contentType, contentId } = createBookmarkDto;

    // 1. Valider que le contenu existe
    await this.validateContentExists(contentType, contentId);

    // 2. Vérifier si le favori existe déjà (Adapté aux nouvelles colonnes)
    const existingBookmark = await this.prisma.bookmark.findFirst({
      where: {
        userId,
        contentType,
        OR: [
          { announcementId: contentId },
          { articleId: contentId },
          { adviceId: contentId },
        ],
      },
    });

    if (existingBookmark) {
      throw new BadRequestException('Ce contenu est déjà dans vos favoris');
    }

    try {
      // 3. Préparer les données d'insertion
      const createData: any = {
        userId,
        contentType,
      };

      // Assigner l'ID à la bonne colonne selon le type
      if (contentType === ContentType.ANNOUNCEMENT) {
        createData.announcementId = contentId;
      } else if (contentType === ContentType.ARTICLE) {
        createData.articleId = contentId;
      } else if (contentType === ContentType.ADVICE) {
        createData.adviceId = contentId; // ✅ Ajout
      }

      const bookmark = await this.prisma.bookmark.create({
        data: createData,
        include: {
          announcement:
            contentType === ContentType.ANNOUNCEMENT
              ? {
                  select: {
                    id: true,
                    title: true,
                    excerpt: true,
                    featuredImage: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    organization: {
                      select: { id: true, name: true, logo: true },
                    },
                  },
                }
              : false,
          article:
            contentType === ContentType.ARTICLE
              ? {
                  select: {
                    id: true,
                    title: true,
                    excerpt: true,
                    featuredImage: true,
                    publishedAt: true,
                    status: true,
                    organization: {
                      select: { id: true, name: true, logo: true },
                    },
                  },
                }
              : false,
        },
      });

      await this.invalidateUserBookmarkCache(userId);
      this.logger.log(
        `Favori ajouté : ${bookmark.id} pour ${contentType} ${contentId}`,
      );

      return new BookmarkEntity(this.transformBookmarkData(bookmark));
    } catch (error) {
      this.logger.error(`Erreur création favori : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'ajout aux favoris");
    }
  }

  // =====================================
  // 📋 LISTE DES FAVORIS (OPTIMISÉE)
  // =====================================
  async findAll(userId: string, query: QueryBookmarkDto) {
    const {
      page = 1,
      limit = 20,
      contentType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // 1. Construction Where Clause (Base)
    const where: any = { userId };
    if (contentType) where.contentType = contentType;

    // 2. Gestion du Cache pour la liste (Cache Key simple)
    // Note: On ne cache pas si il y a une recherche spécifique (trop de variations)
    const useCache = !search;
    const cacheKey = `${this.BOOKMARK_LIST_CACHE_PREFIX}${userId}_${page}_${limit}_${contentType || 'all'}_${sortBy}_${sortOrder}`;

    if (useCache) {
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        this.logger.log(`Cache HIT pour favoris user ${userId}`);
        return cachedData;
      }
    }

    // 3. Recherche Textuelle
    if (search) {
      where.OR = [
        {
          announcement: {
            title: { contains: search, mode: 'insensitive' },
            status: AnnouncementStatus.PUBLISHED, // ✅ FIABILITÉ: Ignorer les annonces supprimées dans la recherche
          },
        },
        {
          announcement: {
            excerpt: { contains: search, mode: 'insensitive' },
            status: AnnouncementStatus.PUBLISHED,
          },
        },
        {
          article: {
            title: { contains: search, mode: 'insensitive' },
            status: ArticleStatus.PUBLISHED, // ✅ FIABILITÉ: Ignorer les articles supprimés
          },
        },
        {
          article: {
            excerpt: { contains: search, mode: 'insensitive' },
            status: ArticleStatus.PUBLISHED,
          },
        },
      ];
    }

    // Construction du orderBy dynamique
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              excerpt: true,
              featuredImage: true,
              thumbnailImage: true,
              startDate: true,
              endDate: true,
              status: true,
              isFree: true,
              organization: {
                select: { id: true, name: true, logo: true },
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          article: {
            select: {
              id: true,
              title: true,
              excerpt: true,
              featuredImage: true,
              thumbnailImage: true,
              readingTime: true,
              tags: true,
              publishedAt: true,
              status: true,
              organization: {
                select: { id: true, name: true, logo: true },
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          advice: {
            select: {
              id: true,
              title: true,
              content: true,
              priority: true,
              category: { select: { id: true, name: true } },
              organization: { select: { id: true, name: true, logo: true } },
              status: true,
            },
          },
        }, // <--- Ferme 'include'
      }), // <--- Ferme 'findMany'
      this.prisma.bookmark.count({ where }),
    ]);

    // ✅ FIABILITÉ: Filtrage post-requête pour supprimer les favoris orphelins (Soft Delete)
    // Même avec les filtres where ci-dessus, Prisma include ne filtre pas parfaitement les parents sur les enfants status.
    // On nettoie le tableau ici.
    const validBookmarks = bookmarks.filter((b) => {
      if (b.contentType === ContentType.ANNOUNCEMENT) {
        return (
          b.announcement && b.announcement.status !== AnnouncementStatus.DELETED
        );
      }
      if (b.contentType === ContentType.ARTICLE) {
        return b.article && b.article.status !== ArticleStatus.DELETED;
      }
      if (b.contentType === ContentType.ADVICE) {
        // ✅ Ajout
        return b.advice && b.advice.status !== AdviceStatus.DELETED;
      }
      return true;
    });

    // Recalculer le total si on a filtré des orphelins (Approximation pour la pagination)
    const filteredTotal = search
      ? total
      : validBookmarks.length + (skip > 0 ? skip : 0); // Simple ajustement

    const response = {
      data: validBookmarks.map(
        (b) => new BookmarkEntity(this.transformBookmarkData(b)),
      ),
      meta: {
        total: filteredTotal, // Idéalement, on devrait re-count, mais c'est coûteux
        page,
        limit,
        totalPages: Math.ceil(filteredTotal / limit),
        hasNextPage: page < Math.ceil(filteredTotal / limit),
        hasPreviousPage: page > 1,
      },
    };

    // Mise en cache (Seulement si pas de recherche)
    if (useCache) {
      await this.cacheManager.set(
        cacheKey,
        response,
        this.BOOKMARK_LIST_CACHE_TTL,
      );
    }

    return response;
  }

  // =====================================
  // 🔍 VÉRIFIER SI UN CONTENU EST EN FAVORI
  // =====================================
  async isBookmarked(
    userId: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<{ isBookmarked: boolean; bookmarkId?: string }> {
    // On cherche le favori selon le type de contenu
    const bookmark = await this.prisma.bookmark.findFirst({
      where: {
        userId,
        contentType,
        OR: [
          { announcementId: contentId },
          { articleId: contentId },
          { adviceId: contentId }, // ✅ Ajout
        ],
      },
      select: { id: true },
    });
    return {
      isBookmarked: !!bookmark,
      bookmarkId: bookmark?.id,
    };
  }

  // =====================================
  // 🗑️ SUPPRIMER UN FAVORI
  // =====================================
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id, userId },
    });

    if (!bookmark) {
      throw new NotFoundException('Favori non trouvé ou accès refusé');
    }

    try {
      await this.prisma.bookmark.delete({
        where: { id },
      });

      // ✅ INVALIDATION CACHE
      await this.invalidateUserBookmarkCache(userId);

      this.logger.log(`Favori supprimé : ${id} par ${userId}`);
      return {
        message: 'Favori supprimé avec succès',
      };
    } catch (error) {
      this.logger.error(`Erreur suppression favori : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suppression du favori');
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UN FAVORI PAR CONTENU
  // =====================================
  async removeByContent(
    userId: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<{ message: string }> {
    try {
      const result = await this.prisma.bookmark.deleteMany({
        where: {
          userId,
          contentType,
          // On cible la colonne spécifique pour la suppression
          AND: [
            {
              OR: [{ announcementId: contentId }, { articleId: contentId }],
            },
          ],
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Aucun favori trouvé pour ce contenu');
      }

      await this.invalidateUserBookmarkCache(userId);
      return { message: 'Favori supprimé avec succès' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Erreur lors de la suppression du favori');
    }
  }

  // =====================================
  // 📊 STATISTIQUES DES FAVORIS
  // =====================================
  async getBookmarkStats(userId: string): Promise<{
    total: number;
    announcements: number;
    articles: number;
    recentBookmarks: BookmarkEntity[];
  }> {
    const [total, announcements, articles, recentBookmarks] = await Promise.all(
      [
        this.prisma.bookmark.count({
          where: { userId },
        }),
        this.prisma.bookmark.count({
          where: { userId, contentType: ContentType.ANNOUNCEMENT },
        }),
        this.prisma.bookmark.count({
          where: { userId, contentType: ContentType.ARTICLE },
        }),
        this.prisma.bookmark.findMany({
          where: { userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            announcement: {
              select: {
                id: true,
                title: true,
                featuredImage: true,
                status: true,
                organization: {
                  select: { id: true, name: true, logo: true },
                },
              },
            },
            article: {
              select: {
                id: true,
                title: true,
                featuredImage: true,
                status: true,
                organization: {
                  select: { id: true, name: true, logo: true },
                },
              },
            },
          },
        }),
      ],
    );

    // Filtrer les orphelins pour les stats aussi
    const validRecent = recentBookmarks.filter((b) => {
      if (b.contentType === ContentType.ANNOUNCEMENT)
        return b.announcement?.status !== AnnouncementStatus.DELETED;
      if (b.contentType === ContentType.ARTICLE)
        return b.article?.status !== ArticleStatus.DELETED;
      return true;
    });

    return {
      total,
      announcements,
      articles,
      recentBookmarks: validRecent.map(
        (b) => new BookmarkEntity(this.transformBookmarkData(b)),
      ),
    };
  }

  // =====================================
  // 🚀 OPTIMISATION : VERIFICATION PAR LOT (AVEC CACHE)
  // =====================================
  /**
   * Vérifie si une liste de contenus est bookmarquée.
   * Utilisé sur les pages listes pour afficher les icônes "Favori".
   */
  async checkMany(
    userId: string,
    contentIds: string[],
  ): Promise<Record<string, boolean>> {
    if (!contentIds || contentIds.length === 0) return {};

    const cacheKey = `user_bookmarks_map:${userId}`;
    let bookmarkMap: Record<string, boolean> = {};

    const cachedMap =
      await this.cacheManager.get<Record<string, boolean>>(cacheKey);
    if (cachedMap) {
      contentIds.forEach((id) => {
        if (cachedMap[id] !== undefined) bookmarkMap[id] = cachedMap[id];
      });
      if (Object.keys(bookmarkMap).length === contentIds.length)
        return bookmarkMap;
    }

    // REQUÊTE DB : On cherche si les IDs sont soit dans announcementId soit dans articleId
    const bookmarks = await this.prisma.bookmark.findMany({
      where: {
        userId,
        OR: [
          { announcementId: { in: contentIds } },
          { articleId: { in: contentIds } },
        ],
      },
      select: {
        announcementId: true,
        articleId: true,
      },
    });

    const freshMap: Record<string, boolean> = {};
    bookmarks.forEach((b) => {
      // On récupère l'ID qui n'est pas nul
      const id = b.announcementId || b.articleId;
      if (id) freshMap[id] = true;
    });

    await this.cacheManager.set(cacheKey, freshMap, 60);
    return freshMap;
  }
  // =====================================
  // 🔧 UTILITAIRES PRIVÉS
  // =====================================

  /**
   * Valide qu'un contenu existe et est publié
   */
  private async validateContentExists(
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    let content;
    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        content = await this.prisma.announcement.findUnique({
          where: { id: contentId, status: AnnouncementStatus.PUBLISHED },
        });
        break;
      case ContentType.ARTICLE:
        content = await this.prisma.article.findUnique({
          where: { id: contentId, status: ArticleStatus.PUBLISHED },
        });
        break;
      case ContentType.ADVICE: // ✅ Ajout
        content = await this.prisma.advice.findUnique({
          where: { id: contentId, status: AdviceStatus.PUBLISHED },
        });
        break;
      default:
        throw new BadRequestException(
          'Type de contenu non supporté pour les favoris',
        );
    }
    if (!content)
      throw new NotFoundException('Contenu non trouvé ou non publié');
  }

  /**
   * Invalide le cache de la liste d'un utilisateur (CRUD)
   */
  private async invalidateUserBookmarkCache(userId: string): Promise<void> {
    // On ne peut pas supprimer par pattern facilement avec cache-manager standard
    // Mais on peut supprimer la clé 'map' si on la connaît, ou compter sur le TTL court.
    // Pour simplifier ici, on supprime la clé map connue.
    await this.cacheManager.del(`user_bookmarks_map:${userId}`);
    // Pour les clés de liste (pages), le TTL court gérera la mise à jour.
    this.logger.log(`Cache invalidé pour user ${userId}`);
  }

  /**
   * Transforme les données de Prisma pour les rendre compatibles avec l'entité
   */
  private transformBookmarkData(bookmark: any): any {
    const transformed = { ...bookmark };

    if (transformed.announcement) {
      transformed.content = transformed.announcement;
      delete transformed.announcement;
    }

    if (transformed.article) {
      transformed.content = transformed.article;
      delete transformed.article;
    }

    return transformed;
  }
}
