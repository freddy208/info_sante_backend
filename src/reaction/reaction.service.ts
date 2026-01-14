/* eslint-disable prettier/prettier */
/* eslint-disable no-prototype-builtins */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { CreateReactionDto, QueryReactionDto } from './dto';
import { ReactionEntity } from './entities';
import { ContentType, Prisma, ReactionType } from '@prisma/client';

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

    if (!userId) {
      throw new BadRequestException("L'identifiant utilisateur est manquant.");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Validation de l'existence du contenu
        await this.validateContentExists(tx, contentType, contentId);

        // 2. Préparation du filtre (On déclare contentField UNE SEULE FOIS ici)
        const contentField = this.getContentFieldName(contentType);
        const whereClause: Prisma.ReactionWhereInput = { 
          userId,
          [contentField]: contentId 
        };

        // 3. Recherche d'une réaction existante
        const existingReaction = await tx.reaction.findFirst({
          where: whereClause,
        });

        if (existingReaction) {
          // Cas A : Même type -> Toggle Off (Suppression)
          if (existingReaction.type === type) {
            await tx.reaction.delete({ where: { id: existingReaction.id } });
            await this.handleCounter(tx, contentType, contentId, -1);
            return null;
          }
          // Cas B : Type différent -> Mise à jour
          const updated = await tx.reaction.update({
            where: { id: existingReaction.id },
            data: { type },
          });
          return new ReactionEntity(this.transformReactionData(updated));
        }

        // Cas C : Nouvelle réaction (On n'utilise plus 'const contentField' ici, elle existe déjà)
        const reaction = await tx.reaction.create({
          data: {
            type,
            contentType, 
            user: { connect: { id: userId } },
            // On utilise toLowerCase() pour correspondre au nom de la relation Prisma (ex: announcement)
            [contentType.toLowerCase()]: { connect: { id: contentId } }
          },
        });

        await this.handleCounter(tx, contentType, contentId, 1);
        return new ReactionEntity(this.transformReactionData(reaction));
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erreur réaction: ${error.message}`);
      throw new BadRequestException('Impossible de traiter la réaction');
    }
  }

  // =====================================
  // 📋 LISTE DES RÉACTIONS
  // =====================================
  async findAll(query: QueryReactionDto) {
    const { page = 1, limit = 20, contentType, contentId, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReactionWhereInput = {};
    if (type) where.type = type;

    // Correction des filtres dynamiques
    if (contentType && contentId) {
      const field = this.getContentFieldName(contentType);
      where[field] = contentId;
    }

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
      meta: { total, page, limit, totalPages },
    };
  }

  // =====================================
  // 📊 STATISTIQUES PAR TYPE
  // =====================================
  async getReactionStats(contentType: ContentType, contentId: string) {
    const where: Prisma.ReactionWhereInput = {};
    const field = this.getContentFieldName(contentType);
    where[field] = contentId;

    const stats = await this.prisma.reaction.groupBy({
      by: ['type'],
      where,
      _count: { type: true },
    });

    const result = { total: 0, LIKE: 0, LOVE: 0, HELPFUL: 0, THANKS: 0 };

    stats.forEach((stat) => {
      const type = stat.type as keyof typeof result;
      const count = stat._count?.type || 0;
      if (result.hasOwnProperty(type)) {
        (result as any)[type] = count;
        result.total += count;
      }
    });

    return result;
  }

  // =====================================
  // 🔧 UTILITAIRES PRIVÉS
  // =====================================

  private getContentFieldName(contentType: ContentType): string {
    switch (contentType) {
      case ContentType.ANNOUNCEMENT:
        return 'announcementId';
      case ContentType.ARTICLE:
        return 'articleId';
      case ContentType.ADVICE:
        return 'adviceId';
      case ContentType.COMMENT:
        return 'commentId';
      default:
        throw new BadRequestException('Type de contenu non supporté');
    }
  }

  private async handleCounter(
    tx: Prisma.TransactionClient,
    type: ContentType,
    id: string,
    increment: number,
  ) {
    const data = { reactionsCount: { increment } };
    const field = this.getContentFieldName(type);

    if (type === ContentType.ANNOUNCEMENT)
      await tx.announcement.update({ where: { id }, data });
    if (type === ContentType.ARTICLE)
      await tx.article.update({ where: { id }, data });
    if (type === ContentType.ADVICE)
      await tx.advice.update({ where: { id }, data });
    if (type === ContentType.COMMENT)
      await tx.comment.update({ where: { id }, data });
  }

  private async validateContentExists(
    tx: Prisma.TransactionClient,
    type: ContentType,
    id: string,
  ) {
    let content;
    if (type === ContentType.ANNOUNCEMENT)
      content = await tx.announcement.findUnique({
        where: { id, status: 'PUBLISHED' },
      });
    if (type === ContentType.ARTICLE)
      content = await tx.article.findUnique({
        where: { id, status: 'PUBLISHED' },
      });
    if (type === ContentType.ADVICE)
      content = await tx.advice.findUnique({
        where: { id, status: 'PUBLISHED' },
      });
    if (type === ContentType.COMMENT)
      content = await tx.comment.findUnique({
        where: { id, status: 'VISIBLE' },
      });

    if (!content)
      throw new NotFoundException('Contenu introuvable ou non publié');
  }

  private transformReactionData(reaction: any): any {
    const transformed = { ...reaction };
    return transformed;
  }
}
