/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateBookmarkDto, QueryBookmarkDto } from './dto';
import { BookmarkEntity } from './entities';
import { ContentType, AnnouncementStatus, ArticleStatus } from '@prisma/client';

/**
 * 🔖 BOOKMARK SERVICE
 *
 * Gère toutes les opérations liées aux favoris (bookmarks).
 *
 * FONCTIONNALITÉS :
 * - Ajouter/supprimer des favoris
 * - Lister les favoris d'un utilisateur
 * - Vérifier si un contenu est en favori
 * - Statistiques sur les favoris
 * - Support multi-contenus (annonces, articles)
 */
@Injectable()
export class BookmarkService {
  private readonly logger = new Logger(BookmarkService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 🔖 AJOUTER UN FAVORI
  // =====================================
  async create(
    createBookmarkDto: CreateBookmarkDto,
    userId: string,
  ): Promise<BookmarkEntity> {
    const { contentType, contentId } = createBookmarkDto;

    // Vérifier que le contenu existe et est publié
    await this.validateContentExists(contentType, contentId);

    // Vérifier que le favori n'existe pas déjà
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType,
          contentId,
        },
      },
    });

    if (existingBookmark) {
      throw new BadRequestException('Ce contenu est déjà dans vos favoris');
    }

    try {
      const bookmark = await this.prisma.bookmark.create({
        data: {
          userId,
          contentType,
          contentId,
        },
        include: {
          // Inclure les détails du contenu pour la réponse
          ...(contentType === ContentType.ANNOUNCEMENT && {
            announcement: {
              select: {
                id: true,
                title: true,
                excerpt: true,
                featuredImage: true,
                startDate: true,
                endDate: true,
                organization: {
                  select: { id: true, name: true, logo: true },
                },
              },
            },
          }),
          ...(contentType === ContentType.ARTICLE && {
            article: {
              select: {
                id: true,
                title: true,
                excerpt: true,
                featuredImage: true,
                publishedAt: true,
                organization: {
                  select: { id: true, name: true, logo: true },
                },
              },
            },
          }),
        },
      });

      this.logger.log(`Favori ajouté : ${bookmark.id} par ${userId}`);
      return new BookmarkEntity(this.transformBookmarkData(bookmark));
    } catch (error) {
      this.logger.error(`Erreur création favori : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'ajout aux favoris");
    }
  }

  // =====================================
  // 📋 LISTE DES FAVORIS D'UN UTILISATEUR
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

    const where: any = { userId };

    if (contentType) {
      where.contentType = contentType;
    }

    if (search) {
      where.OR = [
        // Recherche dans les annonces
        {
          announcement: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
        {
          announcement: {
            excerpt: { contains: search, mode: 'insensitive' },
          },
        },
        // Recherche dans les articles
        {
          article: {
            title: { contains: search, mode: 'insensitive' },
          },
        },
        {
          article: {
            excerpt: { contains: search, mode: 'insensitive' },
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
          // Inclure les détails complets du contenu
          announcement: {
            select: {
              id: true,
              title: true,
              excerpt: true,
              featuredImage: true,
              thumbnailImage: true,
              startDate: true,
              endDate: true,
              isFree: true,
              cost: true,
              targetAudience: true,
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
              organization: {
                select: { id: true, name: true, logo: true },
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: bookmarks.map(
        (b) => new BookmarkEntity(this.transformBookmarkData(b)),
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
  // 🔍 VÉRIFIER SI UN CONTENU EST EN FAVORI
  // =====================================
  async isBookmarked(
    userId: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<{ isBookmarked: boolean; bookmarkId?: string }> {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType,
          contentId,
        },
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
    // Vérifier que le favori existe et appartient à l'utilisateur
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
          contentId,
        },
      });

      if (result.count === 0) {
        throw new NotFoundException('Aucun favori trouvé pour ce contenu');
      }

      this.logger.log(
        `Favori supprimé par contenu : ${contentType}/${contentId} par ${userId}`,
      );
      return {
        message: 'Favori supprimé avec succès',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Erreur suppression favori par contenu : ${error.message}`,
      );
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
        // Total des favoris
        this.prisma.bookmark.count({
          where: { userId },
        }),
        // Nombre d'annonces en favori
        this.prisma.bookmark.count({
          where: { userId, contentType: ContentType.ANNOUNCEMENT },
        }),
        // Nombre d'articles en favori
        this.prisma.bookmark.count({
          where: { userId, contentType: ContentType.ARTICLE },
        }),
        // 5 favoris les plus récents
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
                organization: {
                  select: { id: true, name: true, logo: true },
                },
              },
            },
          },
        }),
      ],
    );

    return {
      total,
      announcements,
      articles,
      recentBookmarks: recentBookmarks.map(
        (b) => new BookmarkEntity(this.transformBookmarkData(b)),
      ),
    };
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
      default:
        throw new BadRequestException(
          'Type de contenu non supporté pour les favoris',
        );
    }

    if (!content) {
      throw new NotFoundException('Contenu non trouvé ou non publié');
    }
  }

  /**
   * Transforme les données de Prisma pour les rendre compatibles avec l'entité
   */
  private transformBookmarkData(bookmark: any): any {
    // Créer une copie pour éviter de modifier l'original
    const transformed = { ...bookmark };

    // Aplatir les données du contenu pour une réponse plus propre
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
