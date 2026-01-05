/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateReactionDto, QueryReactionDto } from './dto';
import { ReactionEntity } from './entities';
import {
  ContentType,
  Prisma,
  PrismaClient,
  ReactionType,
} from '@prisma/client';

// Définir le type de transaction Prisma
type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================
  // ❤️ AJOUTER UNE RÉACTION (ATOMIC)
  // =====================================
  async create(
    createReactionDto: CreateReactionDto,
    userId: string,
  ): Promise<ReactionEntity | null> {
    const { contentType, contentId, type } = createReactionDto;

    try {
      // Utilisation d'une transaction pour garantir l'atomicité
      return await this.prisma.$transaction(async (tx: PrismaTransaction) => {
        // 1. Vérifier que le contenu existe
        await this.validateContentExists(contentType, contentId);

        // 2. Vérifier si l'utilisateur a déjà réagi à ce contenu
        const existingReaction = await this.prisma.reaction.findFirst({
          where: { userId, contentId, contentType },
        });

        if (existingReaction) {
          // 3. Si l'utilisateur a déjà réagi avec le même type, supprimer la réaction
          if (existingReaction.type === type) {
            await tx.reaction.delete({
              where: { id: existingReaction.id },
            });

            // 4. Décrémenter le compteur de réactions
            await this.decrementReactionCount(tx, contentType, contentId);

            this.logger.log(`Réaction supprimée : ${existingReaction.id}`);
            return null; // Retourner null pour indiquer que la réaction a été supprimée
          } else {
            // 5. Si l'utilisateur a déjà réagi avec un type différent, mettre à jour
            const updatedReaction = await tx.reaction.update({
              where: { id: existingReaction.id },
              data: { type },
            });

            this.logger.log(`Réaction mise à jour : ${updatedReaction.id}`);
            return new ReactionEntity(
              this.transformReactionData(updatedReaction),
            );
          }
        } else {
          // 6. Créer une nouvelle réaction
          const reaction = await tx.reaction.create({
            data: {
              userId,
              contentType,
              contentId,
              type,
            },
          });

          // 7. Incrémenter le compteur de réactions
          await this.incrementReactionCount(tx, contentType, contentId);

          this.logger.log(`Réaction créée : ${reaction.id}`);
          return new ReactionEntity(this.transformReactionData(reaction));
        }
      });
    } catch (error) {
      this.logger.error(
        `Erreur création/mise à jour réaction : ${error.message}`,
      );
      throw new BadRequestException('Erreur lors de la gestion de la réaction');
    }
  }

  // =====================================
  // 📋 LISTE DES RÉACTIONS
  // =====================================
  async findAll(query: QueryReactionDto) {
    const { page = 1, limit = 20, contentType, contentId, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (contentType) where.contentType = contentType;
    if (contentId) where.contentId = contentId;
    if (type) where.type = type;

    const [reactions, total] = await Promise.all([
      this.prisma.reaction.findMany({
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
      this.prisma.reaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: reactions.map(
        (r) => new ReactionEntity(this.transformReactionData(r)),
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
  // 📊 STATISTIQUES DES RÉACTIONS POUR UN CONTENU
  // =====================================
  async getReactionStats(contentType: ContentType, contentId: string) {
    const stats = await this.prisma.reaction.groupBy({
      by: ['type'],
      where: { contentType, contentId },
      _count: { type: true },
    });

    const result = {
      total: 0,
      LIKE: 0,
      LOVE: 0,
      HELPFUL: 0,
      THANKS: 0,
    };

    stats.forEach((stat) => {
      result[stat.type] = stat._count.type;
      result.total += stat._count.type;
    });

    return result;
  }

  // =====================================
  // 🔧 UTILITAIRES PRIVÉS
  // =====================================

  /**
   * Valide qu'un contenu existe
   */
  private async validateContentExists(
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    let content;

    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        content = await this.prisma.announcement.findUnique({
          where: { id: contentId, status: 'PUBLISHED' },
        });
        break;
      case ContentType.ARTICLE:
        content = await this.prisma.article.findUnique({
          where: { id: contentId, status: 'PUBLISHED' },
        });
        break;
      case ContentType.ADVICE:
        content = await this.prisma.advice.findUnique({
          where: { id: contentId, status: 'PUBLISHED' },
        });
        break;
      case ContentType.COMMENT:
        content = await this.prisma.comment.findUnique({
          where: { id: contentId, status: 'VISIBLE' },
        });
        break;
      default:
        throw new BadRequestException(
          'Type de contenu non supporté pour les réactions',
        );
    }

    if (!content) {
      throw new NotFoundException('Contenu non trouvé ou non publié');
    }
  }

  /**
   * Incrémente le compteur de réactions sur un contenu
   */
  private async incrementReactionCount(
    tx: PrismaTransaction,
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        await tx.announcement.update({
          where: { id: contentId },
          data: { reactionsCount: { increment: 1 } },
        });
        break;
      case ContentType.ARTICLE:
        await tx.article.update({
          where: { id: contentId },
          data: { reactionsCount: { increment: 1 } },
        });
        break;
      case ContentType.ADVICE:
        await tx.advice.update({
          where: { id: contentId },
          data: { reactionsCount: { increment: 1 } },
        });
        break;
      case ContentType.COMMENT:
        await tx.comment.update({
          where: { id: contentId },
          data: { reactionsCount: { increment: 1 } },
        });
        break;
    }
  }

  /**
   * Décrémente le compteur de réactions sur un contenu
   */
  private async decrementReactionCount(
    tx: PrismaTransaction,
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        await tx.announcement.update({
          where: { id: contentId },
          data: { reactionsCount: { decrement: 1 } },
        });
        break;
      case ContentType.ARTICLE:
        await tx.article.update({
          where: { id: contentId },
          data: { reactionsCount: { decrement: 1 } },
        });
        break;
      case ContentType.ADVICE:
        await tx.advice.update({
          where: { id: contentId },
          data: { reactionsCount: { decrement: 1 } },
        });
        break;
      case ContentType.COMMENT:
        await tx.comment.update({
          where: { id: contentId },
          data: { reactionsCount: { decrement: 1 } },
        });
        break;
    }
  }

  /**
   * Transforme les données de Prisma pour les rendre compatibles avec l'entité
   */
  private transformReactionData(reaction: any): any {
    // Créer une copie pour éviter de modifier l'original
    const transformed = { ...reaction };

    // Convertir les valeurs null en undefined pour les champs optionnels
    const nullableFields = ['deletedAt'];

    nullableFields.forEach((field) => {
      if (transformed[field] === null) {
        transformed[field] = undefined;
      }
    });

    return transformed;
  }
}
