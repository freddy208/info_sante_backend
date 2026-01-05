/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
 
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
  CreateArticleDto,
  UpdateArticleDto,
  QueryArticleDto,
} from './dto';
import { ArticleEntity } from './entities';
import { ArticleStatus } from '@prisma/client';
import { slugify } from 'src/common/utils/slugify.util';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📝 CRÉER UN ARTICLE (BROUILLON)
  // =====================================
  async create(
    createArticleDto: CreateArticleDto,
    organizationId: string,
  ): Promise<ArticleEntity> {
    const { title, categoryId, content } = createArticleDto;

    // Vérification catégorie
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    // Génération slug
    const baseSlug = slugify(title);
    const slug = await this.generateUniqueSlug(baseSlug);

    // Calcul temps de lecture
    const readingTime =
      createArticleDto.readingTime ||
      Math.ceil(content.split(' ').length / 200);

    // Génération excerpt automatique si non fourni
    let { excerpt } = createArticleDto;
    if (!excerpt) {
      const plainText = content.replace(/<[^>]+>/g, ''); // Strip HTML
      excerpt =
        plainText.length > 150
          ? plainText.substring(0, 150).trim() + '...'
          : plainText;
    }

    try {
      const article = await this.prisma.article.create({
        data: {
          ...createArticleDto,
          organizationId,
          slug,
          readingTime,
          excerpt,
          status: ArticleStatus.DRAFT, // Toujours créé en brouillon
        },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Article créé : ${article.id} par ${organizationId}`);
      return new ArticleEntity(article); // ✅ Correction: Retour direct ou transformArticleData
    } catch (error) {
      this.logger.error(`Erreur création article : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création de l'article");
    }
  }

  // =====================================
  // 📋 LISTE PUBLIQUE (CORRIGÉE ET STABLE)
  // =====================================
  async findAll(query: QueryArticleDto) {
    const { page = 1, limit = 20, categoryId, organizationId, search, featured } = query;
    const skip = (page - 1) * limit;

    // Tableau des conditions "ET" (Doivent toutes être vraies)
    // On initialise avec le statut PUBLISHED
    const mustMatch: any[] = [{ status: ArticleStatus.PUBLISHED }];

    // Filtres spécifiques (AND)
    if (categoryId) mustMatch.push({ categoryId });
    if (organizationId) mustMatch.push({ organizationId });
    if (featured !== undefined) mustMatch.push({ isFeatured: featured });

    // Tableau des conditions "OU" (Au moins une doit être vraie)
    const anyMatch: any[] = [];

    if (search) {
      anyMatch.push(
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      );
    }

    // Assemblage final de la clause WHERE
    const where: any = {
      AND: mustMatch.length > 0 ? mustMatch : undefined,
      OR: anyMatch.length > 0 ? anyMatch : undefined,
    };

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          thumbnailImage: true,
          author: true,
          readingTime: true,
          tags: true,
          viewsCount: true,
          sharesCount: true,
          commentsCount: true,
          reactionsCount: true,
          isFeatured: true,
          publishedAt: true,
          organization: {
            select: { id: true, name: true, logo: true }, // ✅ Supprimé city ici
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: articles.map((a) => new ArticleEntity(this.transformArticleData(a))),
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
  // 👤 MES ARTICLES (PRIVÉ)
  // =====================================
  async findMyArticles(organizationId: string, query: QueryArticleDto) {
    const { page = 1, limit = 20, categoryId, status, search, tags } = query;
    const skip = (page - 1) * limit;

    const mustMatch: any[] = [{ organizationId }];
    if (categoryId) mustMatch.push({ categoryId });
    if (status) mustMatch.push({ status });

    const anyMatch: any[] = [];
    if (search) {
      anyMatch.push(
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      );
    }

    const where: any = {
      AND: mustMatch,
      OR: anyMatch.length > 0 ? anyMatch : undefined,
    };

    // Filtre par tags s'ajoute ici (AND)
    if (tags && tags.length > 0) {
      where.AND.push({ tags: { hasSome: tags } });
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: articles.map((a) => new ArticleEntity(this.transformArticleData(a))),
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
  // 🔍 DÉTAILS D'UN ARTICLE (LECTURE PURE - GET)
  // =====================================
  // ✅ BONNE PRATIQUE : Méthode dédiée à la lecture (GET), ne modifie pas les données
  async findOne(idOrSlug: string): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: ArticleStatus.PUBLISHED,
      },
      include: {
        organization: {
          select: { id: true, name: true, logo: true, phone: true },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé');
    }

    return new ArticleEntity(this.transformArticleData(article));
  }

  // =====================================
  // 👁 INCRÉMENTER LES VUES (ÉCRITURE - PATCH)
  // =====================================
  // ✅ NOUVEAU : Méthode explicite pour gérer les vues (Best Practice)
  async viewArticle(idOrSlug: string): Promise<ArticleEntity> {
    // 1. Vérifier que l'article existe
    const article = await this.prisma.article.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: ArticleStatus.PUBLISHED,
      },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé');
    }

    // 2. Incrémenter le compteur de vues
    try {
      await this.prisma.article.update({
        where: { id: article.id },
        data: { viewsCount: { increment: 1 } },
      });
    } catch (error) {
      this.logger.error(`Erreur incrémentation vue: ${error.message}`);
    }

    // 3. Récupérer et retourner l'objet mis à jour (pour que le Frontend ait le bon nombre de vues)
    const updatedArticle = await this.prisma.article.findFirst({
      where: { id: article.id },
      include: {
        organization: {
          select: { id: true, name: true, logo: true, phone: true },
        },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return new ArticleEntity(this.transformArticleData(updatedArticle));
  }

  // =====================================
  // ✏️ METTRE À JOUR UN ARTICLE (BROUILLON)
  // =====================================
  // Note: Pas de gestion de compteurs ici car on est en brouillon
  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    organizationId: string,
  ): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé ou accès refusé');
    }

    if (article.status === ArticleStatus.PUBLISHED) {
      throw new ForbiddenException(
        "Impossible de modifier un article publié. Archivez-le d'abord.",
      );
    }

    // Slug
    if (
      updateArticleDto.title &&
      updateArticleDto.title !== article.title
    ) {
      const baseSlug = slugify(updateArticleDto.title);
      updateArticleDto['slug'] = await this.generateUniqueSlug(baseSlug);
    }

    // Reading Time auto
    if (updateArticleDto.content && !updateArticleDto.readingTime) {
      updateArticleDto['readingTime'] = Math.ceil(
        updateArticleDto.content.split(' ').length / 200,
      );
    }

    try {
      const updatedArticle = await this.prisma.article.update({
        where: { id },
        data: updateArticleDto,
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Article mis à jour : ${id}`);
      return new ArticleEntity(
        this.transformArticleData(updatedArticle),
      );
    } catch (error) {
      this.logger.error(`Erreur mise à jour article : ${error.message}`);
      throw new BadRequestException('Erreur lors de la mise à jour');
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UN ARTICLE (SOFT DELETE)
  // =====================================
  async remove(
    id: string,
    organizationId: string,
  ): Promise<{ message: string }> {
    // 1. Récupérer l'article (pour avoir categoryId et status actuel)
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId },
      include: { category: { select: { id: true } } },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé ou accès refusé');
    }

    try {
      // 2. Transaction Atomique
      await this.prisma.$transaction(async (tx) => {
        // A. Marquer l'article comme supprimé
        await tx.article.update({
          where: { id },
          data: { status: ArticleStatus.DELETED, deletedAt: new Date() },
        });

        // B. Si l'article était PUBLIÉ, on décrémente le compteur de la catégorie
        if (article.status === ArticleStatus.PUBLISHED) {
          await tx.category.update({
            where: { id: article.categoryId },
            data: { articlesCount: { decrement: 1 } },
          });
        }
      });

      this.logger.log(`Article supprimé : ${id}`);
      return { message: 'Article supprimé avec succès' };
    } catch (error) {
      this.logger.error(`Erreur suppression article : ${error.message}`);
      throw new BadRequestException("Erreur lors de la suppression");
    }
  }

  // =====================================
  // 📢 PUBLIER UN ARTICLE (STATUS CHANGE + COMPTEURS)
  // =====================================
  async publish(
    id: string,
    organizationId: string,
  ): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId, status: ArticleStatus.DRAFT },
    });

    if (!article) {
      throw new NotFoundException(
        'Article non trouvé, déjà publié ou accès refusé',
      );
    }

    try {
      // 1. Transaction Atomique
      const publishedArticle = await this.prisma.$transaction(async (tx) => {
        // A. Mettre à jour l'article (DRAFT -> PUBLISHED)
        const updated = await tx.article.update({
          where: { id },
          data: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });

        // B. Incrémenter le compteur de la catégorie
        await tx.category.update({
          where: { id: updated.categoryId },
          data: { articlesCount: { increment: 1 } },
        });

        return updated; // On renvoie l'objet mis à jour
      });

      this.logger.log(`Article publié : ${id}`);

      // 2. Relire l'article avec les relations pour le renvoyer au client
      const withRelations = await this.prisma.article.findUnique({
        where: { id },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      return new ArticleEntity(this.transformArticleData(withRelations));
    } catch (error) {
      this.logger.error(`Erreur publication article : ${error.message}`);
      throw new BadRequestException("Erreur lors de la publication");
    }
  }

  // =====================================
  // ⭐ METTRE EN AVANT (FEATURE)
  // =====================================
  async feature(
    id: string,
    organizationId: string,
    isFeatured: boolean,
  ): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé ou accès refusé');
    }

    try {
      const updatedArticle = await this.prisma.article.update({
        where: { id },
        data: { isFeatured },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(
        `Article ${isFeatured ? 'mis en avant' : "retiré de l'avant"} : ${id}`,
      );
      return new ArticleEntity(this.transformArticleData(updatedArticle));
    } catch (error) {
      this.logger.error(`Erreur mise en avant article : ${error.message}`);
      throw new BadRequestException("Erreur lors de la mise en avant");
    }
  }

  // =====================================
  // 🔧 UTILITAIRES PRIVÉS
  // =====================================
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 1;

    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return slug;
  }

  /**
   * Transforme les données de Prisma pour les rendre compatibles avec l'entité
   */
  private transformArticleData(article: any): any {
    const transformed = { ...article };
    const nullableFields = [
      'slug',
      'excerpt',
      'thumbnailImage',
      'author',
      'readingTime',
      'publishedAt',
      'deletedAt',
    ];

    nullableFields.forEach((field) => {
      if (transformed[field] === null) {
        transformed[field] = undefined;
      }
    });

    return transformed;
  }
}