/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { CreateArticleDto, UpdateArticleDto, QueryArticleDto } from './dto';
import { ArticleEntity } from './entities';
import { ArticleStatus } from '@prisma/client';
import { slugify } from 'src/common/utils/slugify.util';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 📝 CRÉER UN ARTICLE
  // =====================================
  async create(
    createArticleDto: CreateArticleDto,
    organizationId: string,
  ): Promise<ArticleEntity> {
    const { title, categoryId, content } = createArticleDto;

    // Vérifier que la catégorie existe
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    // Calculer le temps de lecture si non fourni (moyenne de 200 mots par minute)
    const readingTime =
      createArticleDto.readingTime ||
      Math.ceil(content.split(' ').length / 200);

    // Générer un slug unique
    const baseSlug = slugify(title);
    const slug = await this.generateUniqueSlug(baseSlug);

    try {
      const article = await this.prisma.article.create({
        data: {
          ...createArticleDto,
          organizationId,
          slug,
          readingTime,
          status: ArticleStatus.DRAFT, // Toujours créé en brouillon
        },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Article créé : ${article.id} par ${organizationId}`);
      return new ArticleEntity(this.transformArticleData(article));
    } catch (error) {
      this.logger.error(`Erreur création article : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création de l'article");
    }
  }

  // =====================================
  // 📋 LISTE PUBLIQUE
  // =====================================
  async findAll(query: QueryArticleDto) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      organizationId,
      search,
      city,
      tags,
      featured,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: ArticleStatus.PUBLISHED,
    };

    if (categoryId) where.categoryId = categoryId;
    if (organizationId) where.organizationId = organizationId;
    if (featured !== undefined) where.isFeatured = featured;
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) {
      where.organization = { city: { contains: city, mode: 'insensitive' } };
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: articles.map(
        (a) => new ArticleEntity(this.transformArticleData(a)),
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
  // 👤 MES ARTICLES (PRIVÉ)
  // =====================================
  async findMyArticles(organizationId: string, query: QueryArticleDto) {
    const { page = 1, limit = 20, categoryId, status, search, tags } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      data: articles.map(
        (a) => new ArticleEntity(this.transformArticleData(a)),
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
  // 🔍 DÉTAILS D'UN ARTICLE
  // =====================================
  async findOne(
    idOrSlug: string,
    incrementView = true,
  ): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        status: ArticleStatus.PUBLISHED, // Seul le contenu publié est visible publiquement
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

    // Incrémenter le compteur de vues (de manière asynchrone pour ne pas bloquer la réponse)
    if (incrementView) {
      this.prisma.article
        .update({
          where: { id: article.id },
          data: { viewsCount: { increment: 1 } },
        })
        .catch((err) =>
          this.logger.error(`Erreur incrémentation vue: ${err.message}`),
        );
    }

    return new ArticleEntity(this.transformArticleData(article));
  }

  // =====================================
  // ✏️ METTRE À JOUR UN ARTICLE
  // =====================================
  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    organizationId: string,
  ): Promise<ArticleEntity> {
    // Vérifier que l'article existe et appartient à l'organisation
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

    // Si le titre change, régénérer le slug
    if (updateArticleDto.title && updateArticleDto.title !== article.title) {
      const baseSlug = slugify(updateArticleDto.title);
      updateArticleDto['slug'] = await this.generateUniqueSlug(baseSlug);
    }

    // Si le contenu change, recalculer le temps de lecture
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
      return new ArticleEntity(this.transformArticleData(updatedArticle));
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
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé ou accès refusé');
    }

    await this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.DELETED, deletedAt: new Date() },
    });

    this.logger.log(`Article supprimé : ${id}`);
    return { message: 'Article supprimé avec succès' };
  }

  // =====================================
  // 📢 PUBLIER UN ARTICLE
  // =====================================
  async publish(id: string, organizationId: string): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId, status: ArticleStatus.DRAFT },
    });

    if (!article) {
      throw new NotFoundException(
        'Article non trouvé, déjà publié ou accès refusé',
      );
    }

    const publishedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        organization: { select: { id: true, name: true, logo: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    this.logger.log(`Article publié : ${id}`);
    // TODO: Déclencher l'envoi de notifications aux abonnés
    return new ArticleEntity(this.transformArticleData(publishedArticle));
  }

  // =====================================
  // ⭐ METTRE EN AVANT UN ARTICLE
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
  }

  // =====================================
  // 🔧 UTILITAIRES
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
    // Créer une copie pour éviter de modifier l'original
    const transformed = { ...article };

    // Convertir les valeurs null en undefined pour les champs optionnels
    const nullableFields = [
      'slug',
      'excerpt',
      'thumbnailImage',
      'author',
      'readingTime',
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
