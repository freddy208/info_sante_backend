/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReactionService } from './reaction.service';
import { CreateReactionDto, QueryReactionDto } from './dto';
import { ReactionEntity } from './entities';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Reactions')
@Controller('reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  // =====================================
  // ❤️ AJOUTER UNE RÉACTION (Protégé)
  // =====================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ajouter, modifier ou supprimer une réaction',
    description: `
      Ajoute une nouvelle réaction, modifie une réaction existante, ou supprime une réaction.
      
      **Comportement :**
      - Si l'utilisateur n'a jamais réagi : Crée une nouvelle réaction
      - Si l'utilisateur a déjà réagi avec le même type : Supprime la réaction
      - Si l'utilisateur a déjà réagi avec un type différent : Met à jour la réaction
      
      **Types de contenu supportés :**
      - ANNOUNCEMENT : Annonces et campagnes
      - ARTICLE : Articles de santé
      - ADVICE : Conseils santé
      - COMMENT : Commentaires sur les annonces et articles
      
      **Types de réactions :**
      - LIKE : J'aime
      - LOVE : J'adore
      - HELPFUL : Utile
      - THANKS : Merci
    `,
  })
  @ApiResponse({ status: 200, type: ReactionEntity })
  @ApiResponse({
    status: 200,
    description: 'Réaction supprimée',
    schema: { example: null },
  })
  async create(
    @Body() createReactionDto: CreateReactionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reactionService.create(createReactionDto, userId);
  }

  // =====================================
  // 📋 LISTE DES RÉACTIONS (Public)
  // =====================================
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lister les réactions',
    description: `
      Liste les réactions avec possibilité de filtrer par type de contenu, ID du contenu ou type de réaction.
      
      **Filtres disponibles :**
      - contentType : Type de contenu (ANNOUNCEMENT, ARTICLE, ADVICE, COMMENT)
      - contentId : ID du contenu
      - type : Type de réaction (LIKE, LOVE, HELPFUL, THANKS)
    `,
  })
  @ApiResponse({
    status: 200,
    schema: { example: { data: [new ReactionEntity({})], meta: {} } },
  })
  async findAll(@Query() query: QueryReactionDto) {
    return this.reactionService.findAll(query);
  }

  // =====================================
  // 📊 STATISTIQUES DES RÉACTIONS (Public)
  // =====================================
  @Public()
  @Get('stats/:contentType/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Statistiques des réactions pour un contenu',
    description: `
      Retourne le nombre total de réactions et le détail par type pour un contenu spécifique.
      
      **Exemple de réponse :**
      {
        "total": 25,
        "LIKE": 15,
        "LOVE": 7,
        "HELPFUL": 2,
        "THANKS": 1
      }
    `,
  })
  async getReactionStats(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
  ) {
    return this.reactionService.getReactionStats(contentType as any, contentId);
  }
}
