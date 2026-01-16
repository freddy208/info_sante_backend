/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

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
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateArticleDto,
  UpdateArticleDto,
  QueryArticleDto,
} from './dto';
import { ArticleEntity } from './entities';
import { ArticleStatus, Prisma } from '@prisma/client';
import { slugify } from 'src/common/utils/slugify.util';
import * as sanitizeHtml from 'sanitize-html'; // ✅ SÉCURITÉ: Installation requise
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);
  
  // ✅ SCALABILITÉ: Configuration Redis (Identique aux Annonces)
  private readonly VIEWS_CACHE_PREFIX = 'article_views:';
  private readonly VIEWS_BATCH_THRESHOLD = 10; // Sync vers DB tous les 10 vues

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  // =====================================
  // 📝 CRÉER UN ARTICLE (SÉCURISÉ)
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

    // ✅ SÉCURITÉ: Nettoyage du contenu HTML pour éviter les attaques XSS
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']), // Autoriser les tags utiles
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height'],
      },
    });

    // Calcul temps de lecture
    const readingTime =
      createArticleDto.readingTime ||
      Math.ceil(sanitizedContent.split(' ').length / 200);

    // Génération excerpt automatique si non fourni
    let { excerpt } = createArticleDto;
    if (!excerpt) {
      // On retire aussi les tags HTML pour l'excerpt
      const plainText = sanitizedContent.replace(/<[^>]+>/g, ''); 
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
          content: sanitizedContent, // ✅ On sauvegarde le contenu nettoyé
          readingTime,
          excerpt,
          status: ArticleStatus.DRAFT,
        },
        include: {
          organization: { select: { id: true, name: true, logo: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      });

      this.logger.log(`Article créé : ${article.id} par ${organizationId}`);
      return new ArticleEntity(article);
    } catch (error) {
      this.logger.error(`Erreur création article : ${error.message}`);
      throw new BadRequestException("Erreur lors de la création de l'article");
    }
  }

  // =====================================
  // 📋 LISTE PUBLIQUE (OPTIMISÉE)
  // =====================================
  // =====================================
  // 📋 LISTE PUBLIQUE (OPTIMISÉE + FIX)
  // =====================================
async findAll(query: QueryArticleDto) {
  const { page = 1, limit = 20, categoryId, organizationId, search } = query;
  const skip = (page - 1) * limit;

  // ✅ 1. Déclaration de la variable manquante (Gestion propre du boolean)
  const isFeaturedFilter = query.featured === true || (query.featured as any) === 'true';

  let articles: any[] = [];
  let total = 0;

  if (search) {
      const searchQuery = search.trim().split(/\s+/).join(' & ');
      
      // ✅ 1. Filtre pour isFeatured
      const featuredSql = query.featured !== undefined 
        ? Prisma.sql`AND a."isFeatured" = ${isFeaturedFilter}` 
        : Prisma.empty;

      // ✅ 2. CORRECTION DES NOMS DE TABLES (Article -> articles, Organization -> organizations, Category -> categories)
      articles = await this.prisma.$queryRaw<any[]>`
        SELECT 
          a."id", a."title", a."slug", a."content", a."excerpt", 
          a."featuredImage", a."thumbnailImage", a."author", a."readingTime", a."tags",
          a."viewsCount", a."sharesCount", a."commentsCount", a."reactionsCount",
          a."isFeatured", a."publishedAt", a."status",
          a."organizationId", a."categoryId",
          o."id" as "organizationId", o."name" as "organizationName", o."logo" as "organizationLogo",
          c."id" as "categoryId", c."name" as "categoryName", c."slug" as "categorySlug"
        FROM "articles" a  
        LEFT JOIN "organizations" o ON o.id = a."organizationId"
        LEFT JOIN "categories" c ON c.id = a."categoryId"
        WHERE a."status" = 'PUBLISHED'
          AND (
            to_tsvector('french', a."title" || ' ' || coalesce(a."excerpt",'')) @@ to_tsquery('french', ${searchQuery})
            OR a."title" ILIKE ${`%${search}%`}
          )
          ${featuredSql}
          ${categoryId ? Prisma.sql`AND a."categoryId" = ${categoryId}` : Prisma.empty}
        ORDER BY a."isFeatured" DESC, a."publishedAt" DESC
        LIMIT ${limit} OFFSET ${skip};
      `;

      const countRes = await this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int as count 
        FROM "articles" a  -- ✅ CORRECTION ICI
        WHERE a."status"='PUBLISHED' 
          AND (
            to_tsvector('french', a."title" || ' ' || coalesce(a."excerpt",'')) @@ to_tsquery('french', ${searchQuery})
            OR a."title" ILIKE ${`%${search}%`}
          )
      `;
      total = countRes[0]?.count || 0;
    } else {
    // Mode sans recherche (Prisma natif)
    const where: any = { status: ArticleStatus.PUBLISHED };
    if (categoryId) where.categoryId = categoryId;
    if (organizationId) where.organizationId = organizationId;
    
    // ✅ 3. Application sécurisée du filtre boolean
    if (query.featured !== undefined) {
      where.isFeatured = isFeaturedFilter;
    }

    [articles, total] = await Promise.all([
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
  }

  // Enrichissement avec les vues Redis
  const enriched = await Promise.all(
    articles.map(async (a) => ({
      ...a,
      viewsCount: (a.viewsCount || 0) + (await this.getCachedViews(a.id)),
    })),
  );

  const totalPages = Math.ceil(total / limit);
  return {
    data: enriched.map(a => new ArticleEntity(this.transformArticleData(a))),
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
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
    // Ici on peut chercher dans le contenu pour l'auteur car il a moins d'articles
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
  async findOne(idOrSlug: string): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: ArticleStatus.PUBLISHED },
      include: { organization: { select: { id: true, name: true, logo: true } }, category: { select: { id: true, name: true, slug: true } } },
    });
    if (!article) throw new NotFoundException('Article non trouvé');

    const cachedViews = await this.getCachedViews(article.id);
    return new ArticleEntity(this.transformArticleData({ ...article, viewsCount: article.viewsCount + cachedViews }));
  }


  // ===============================
  // INCREMENTER VUES
  // ===============================
  async viewArticle(idOrSlug: string): Promise<ArticleEntity> {
    const article = await this.prisma.article.findFirst({ where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], status: ArticleStatus.PUBLISHED } });
    if (!article) throw new NotFoundException('Article non trouvé');
    this.incrementViewInCache(article.id).catch(err => this.logger.error(err.message));

    const cachedViews = await this.getCachedViews(article.id);
    return new ArticleEntity(this.transformArticleData({ ...article, viewsCount: article.viewsCount + cachedViews }));
  }


  // =====================================
  // ✏️ METTRE À JOUR UN ARTICLE (BROUILLON)
  // =====================================
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

    // ✅ FIABILITÉ: Empêcher la modification d'un article publié (sauf si logique d'archive gérée ailleurs)
    // Ici on suit la logique stricte : impossible de modifier un article publié
    if (article.status === ArticleStatus.PUBLISHED) {
      throw new ForbiddenException(
        "Impossible de modifier un article publié. Archivez-le d'abord.",
      );
    }

    // ✅ SÉCURITÉ & SEO: Sanitization du contenu si fourni
    if (updateArticleDto.content) {
        updateArticleDto.content = sanitizeHtml(updateArticleDto.content, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
            allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ['src', 'alt'] },
        });
    }

    // ✅ SEO: Régénération Slug (Seulement si brouillon, protégé par le check PUBLISHED ci-dessus)
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
    const article = await this.prisma.article.findFirst({
      where: { id, organizationId },
      include: { category: { select: { id: true } } },
    });

    if (!article) {
      throw new NotFoundException('Article non trouvé ou accès refusé');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.article.update({
          where: { id },
          data: { status: ArticleStatus.DELETED, deletedAt: new Date() },
        });

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
  // 📢 PUBLIER UN ARTICLE
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
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.article.update({
          where: { id },
          data: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });

        await tx.category.update({
          where: { id: updated.categoryId },
          data: { articlesCount: { increment: 1 } },
        });

        return updated;
      });

      this.logger.log(`Article publié : ${id}`);

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

  // ===============================
  // REDIS VIEWS
  // ===============================
private async incrementViewInCache(articleId: string) {
  const key = `${this.VIEWS_CACHE_PREFIX}${articleId}`;
  let count = (await this.cacheManager.get<number>(key)) || 0;
  count++;

  // Correct pour ta version : TTL en secondes passé comme second param
  await this.cacheManager.set(key, count, 86400); // 24h

  if (count >= this.VIEWS_BATCH_THRESHOLD) {
    await this.syncViewsToDatabase(articleId, count);
  }
}


  private async getCachedViews(articleId: string) {
    const key = `${this.VIEWS_CACHE_PREFIX}${articleId}`;
    return (await this.cacheManager.get<number>(key)) || 0;
  }

  private async syncViewsToDatabase(articleId: string, count: number) {
    await this.prisma.article.update({ where: { id: articleId }, data: { viewsCount: { increment: count } } });
    await this.cacheManager.del(`${this.VIEWS_CACHE_PREFIX}${articleId}`);
    this.logger.log(`✅ ${count} vues synchronisées pour ${articleId}`);
  }
@Cron(CronExpression.EVERY_HOUR)
async syncAllViewsToDatabase() {
  this.logger.log('🔄 Synchronisation CRON des vues articles');
  const store = this.cacheManager as any;
  const keysMethod = store.keys || (store.store && store.store.keys);

  if (!keysMethod) return;

  const keys: string[] = await keysMethod(`${this.VIEWS_CACHE_PREFIX}*`);
    for (const key of keys) {
      const articleId = key.replace(this.VIEWS_CACHE_PREFIX, '');
      const cachedCount = await this.getCachedViews(articleId);
      if (cachedCount > 0) await this.syncViewsToDatabase(articleId, cachedCount);
    }
  }

  // ===============================
  // UTILITAIRES
  // ===============================
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }
    return slug;
  }

private transformArticleData(article: any) {
  // Si les données viennent du SQL brut (flattened)
  if (article.organizationName) {
    article.organization = {
      id: article.organizationId,
      name: article.organizationName,
      logo: article.organizationLogo,
    };
    article.category = {
      id: article.categoryId,
      name: article.categoryName,
      slug: article.categorySlug,
    };
  }

  // Gestion des nulls pour éviter les crashs Entity
  const nullable = ['slug', 'excerpt', 'thumbnailImage', 'author', 'readingTime', 'publishedAt'];
  nullable.forEach(f => {
    if (article[f] === null) article[f] = undefined;
  });

  return article;
}
}