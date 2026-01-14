/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { CreateCommentDto, UpdateCommentDto, QueryCommentDto } from './dto';
import { CommentEntity } from './entities';
import {
  CommentStatus,
  ContentType,
  AnnouncementStatus,
  ArticleStatus,
  AdviceStatus,
} from '@prisma/client';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // 💬 CRÉER UN COMMENTAIRE
  // =====================================
  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    const { contentType, contentId, parentCommentId, content } =
      createCommentDto;

    // 1. Sécurité : Vérifier si l'userId est bien présent
    if (!userId) {
      throw new BadRequestException("L'identifiant utilisateur est manquant.");
    }

    // 2. Valider que le contenu cible existe
    await this.validateContentExists(contentType, contentId);

    // 3. Préparer l'objet de données avec les relations Prisma (connect)
    const data: any = {
      content,
      contentType,
      contentId,
      // On utilise "connect" pour lier l'utilisateur par son ID
      user: { connect: { id: userId } },
    };

    // ✅ Gestion du parent (réponse à un commentaire)
    if (parentCommentId) {
      data.parentComment = { connect: { id: parentCommentId } };
    }

    // ✅ Liaison à la table spécifique (Announcement ou Article)
    // ... après Article
    if (contentType === ContentType.ANNOUNCEMENT) {
      data.announcement = { connect: { id: contentId } };
    } else if (contentType === ContentType.ARTICLE) {
      data.article = { connect: { id: contentId } };
    } else if (contentType === ContentType.ADVICE) {
      // ✅ Ajout pour Advice
      data.advice = { connect: { id: contentId } };
    }

    try {
      const comment = await this.prisma.comment.create({
        data,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });

      // 4. Incrémenter les compteurs
      await this.incrementCommentCount(contentType, contentId);

      if (parentCommentId) {
        await this.prisma.comment.update({
          where: { id: parentCommentId },
          data: { repliesCount: { increment: 1 } },
        });
      }

      return new CommentEntity(this.transformCommentData(comment));
    } catch (error) {
      this.logger.error(`Erreur création commentaire : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la création du commentaire',
      );
    }
  }

  // =====================================
  // 📋 LISTE DE COMMENTAIRES
  // =====================================
  async findAll(query: QueryCommentDto) {
    const {
      page = 1,
      limit = 20,
      contentType,
      contentId,
      status,
      search,
      parentCommentId,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;
    if (status) where.status = status;
    if (parentCommentId) where.parentCommentId = parentCommentId;
    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }

    // Par défaut, n'afficher que les commentaires visibles
    if (!status) {
      where.status = CommentStatus.VISIBLE;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: comments.map(
        (c) => new CommentEntity(this.transformCommentData(c)),
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
  // 🔍 DÉTAILS D'UN COMMENTAIRE
  // =====================================
  async findOne(id: string): Promise<CommentEntity> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé');
    }

    return new CommentEntity(this.transformCommentData(comment));
  }

  // =====================================
  // 💬 COMMENTAIRES POUR UN CONTENU
  // =====================================
  async findByContent(
    contentType: ContentType,
    contentId: string,
    query: QueryCommentDto,
  ): Promise<any> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Récupérer les commentaires principaux (sans parent)
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          contentType,
          contentId,
          parentCommentId: null,
          status: CommentStatus.VISIBLE,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          contentType,
          contentId,
          parentCommentId: null,
          status: CommentStatus.VISIBLE,
        },
      }),
    ]);

    // Récupérer les 3 premières réponses pour chaque commentaire
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await this.prisma.comment.findMany({
          where: {
            parentCommentId: comment.id,
            status: CommentStatus.VISIBLE,
          },
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        });

        const totalReplies = await this.prisma.comment.count({
          where: {
            parentCommentId: comment.id,
            status: CommentStatus.VISIBLE,
          },
        });

        return {
          ...this.transformCommentData(comment),
          replies: replies.map(
            (r) => new CommentEntity(this.transformCommentData(r)),
          ),
          totalReplies,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: commentsWithReplies.map((c) => new CommentEntity(c)),
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
  // ✏️ METTRE À JOUR UN COMMENTAIRE
  // =====================================
  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
  ): Promise<CommentEntity> {
    // Vérifier que le commentaire existe et appartient à l'utilisateur
    const comment = await this.prisma.comment.findFirst({
      where: { id, userId },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé ou accès refusé');
    }

    if (comment.status !== CommentStatus.VISIBLE) {
      throw new BadRequestException(
        'Impossible de modifier un commentaire masqué ou supprimé',
      );
    }

    try {
      const updatedComment = await this.prisma.comment.update({
        where: { id },
        data: {
          ...updateCommentDto,
          editedAt: new Date(),
          isEdited: true,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      });

      this.logger.log(`Commentaire mis à jour : ${id}`);
      return new CommentEntity(this.transformCommentData(updatedComment));
    } catch (error) {
      this.logger.error(`Erreur mise à jour commentaire : ${error.message}`);
      throw new BadRequestException(
        'Erreur lors de la mise à jour du commentaire',
      );
    }
  }

  // =====================================
  // 🗑️ SUPPRIMER UN COMMENTAIRE (SOFT DELETE)
  // =====================================
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const comment = await this.prisma.comment.findFirst({
      where: { id, userId },
    });

    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé ou accès refusé');
    }

    await this.prisma.comment.update({
      where: { id },
      data: { status: CommentStatus.DELETED, deletedAt: new Date() },
    });

    // Décrémenter le compteur de commentaires sur le contenu
    await this.decrementCommentCount(comment.contentType, comment.contentId);

    // Si c'est une réponse, décrémenter le compteur de réponses du parent
    if (comment.parentCommentId) {
      await this.prisma.comment.update({
        where: { id: comment.parentCommentId },
        data: { repliesCount: { decrement: 1 } },
      });
    }

    this.logger.log(`Commentaire supprimé : ${id}`);
    return { message: 'Commentaire supprimé avec succès' };
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
      case ContentType.ADVICE:
        // ✅ Ajout pour Advice
        content = await this.prisma.advice.findUnique({
          where: { id: contentId, status: AdviceStatus.PUBLISHED },
        });
        break;
      default:
        throw new BadRequestException(
          'Type de contenu non supporté pour les commentaires',
        );
    }

    if (!content) {
      throw new NotFoundException('Contenu non trouvé ou non publié');
    }
  }

  /**
   * Incrémente le compteur de commentaires sur un contenu
   */
  private async incrementCommentCount(
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        await this.prisma.announcement.update({
          where: { id: contentId },
          data: { commentsCount: { increment: 1 } },
        });
        break;
      case ContentType.ARTICLE:
        await this.prisma.article.update({
          where: { id: contentId },
          data: { commentsCount: { increment: 1 } },
        });
        break;
      case ContentType.ADVICE:
        // ✅ Si vous avez ajouté le champ commentsCount dans le modèle Advice
        await this.prisma.advice.update({
          where: { id: contentId },
          data: { commentsCount: { increment: 1 } },
        });
        break;
    }
  }

  /**
   * Décrémente le compteur de commentaires sur un contenu
   */
  private async decrementCommentCount(
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        await this.prisma.announcement.update({
          where: { id: contentId },
          data: { commentsCount: { decrement: 1 } },
        });
        break;
      case ContentType.ARTICLE:
        await this.prisma.article.update({
          where: { id: contentId },
          data: { commentsCount: { decrement: 1 } },
        });
        break;
      case ContentType.ADVICE:
        await this.prisma.advice.update({
          where: { id: contentId },
          data: { commentsCount: { decrement: 1 } },
        });
        break;
    }
  }

  /**
   * Transforme les données de Prisma pour les rendre compatibles avec l'entité
   */
  private transformCommentData(comment: any): any {
    // Créer une copie pour éviter de modifier l'original
    const transformed = { ...comment };

    // Convertir les valeurs null en undefined pour les champs optionnels
    const nullableFields = [
      'parentCommentId',
      'editedAt',
      'hiddenBy',
      'hiddenReason',
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
