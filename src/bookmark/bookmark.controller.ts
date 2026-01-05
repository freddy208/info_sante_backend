import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { CreateBookmarkDto, QueryBookmarkDto } from './dto';
import { BookmarkEntity } from './entities';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContentType } from '@prisma/client';

/**
 * 🔖 BOOKMARKS CONTROLLER
 *
 * Gère toutes les routes liées aux favoris.
 *
 * ROUTES PROTÉGÉES (USER) :
 * - POST /bookmarks (ajouter un favori)
 * - GET /bookmarks (liste des favoris)
 * - GET /bookmarks/check/:contentType/:contentId (vérifier si en favori)
 * - DELETE /bookmarks/:id (supprimer un favori)
 * - DELETE /bookmarks/content/:contentType/:contentId (supprimer par contenu)
 * - GET /bookmarks/stats (statistiques)
 */
@ApiTags('Bookmarks')
@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  // =====================================
  // 🔖 AJOUTER UN FAVORI (Protégé)
  // =====================================
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajouter un contenu aux favoris',
    description: `
      Ajouter une annonce ou un article aux favoris de l'utilisateur connecté.
      
      **Validation :**
      - Le contenu doit exister et être publié
      - Un utilisateur ne peut pas mettre le même contenu en favori deux fois
      
      **Types supportés :**
      - ANNOUNCEMENT : Annonces de santé/campagnes
      - ARTICLE : Articles médicaux/conseils
      
      **Cas d'usage :**
      - Sauvegarder un article pour le lire plus tard
      - Marquer une annonce pour y revenir
      - Créer une liste de contenus favoris
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Favori ajouté avec succès',
    type: BookmarkEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Contenu déjà en favori ou invalide',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Contenu non trouvé',
  })
  async create(
    @Body() createBookmarkDto: CreateBookmarkDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookmarkService.create(createBookmarkDto, userId);
  }

  // =====================================
  // 📋 LISTE DES FAVORIS (Protégé)
  // =====================================
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Lister les favoris de l'utilisateur",
    description: `
      Récupérer la liste paginée des favoris de l'utilisateur connecté.
      
      **Filtres disponibles :**
      - contentType : Filtrer par type de contenu (ANNOUNCEMENT/ARTICLE)
      - search : Recherche dans le titre/extrait du contenu
      - sortBy : Champ de tri (createdAt/contentType)
      - sortOrder : Ordre de tri (asc/desc)
      
      **Inclus dans la réponse :**
      - Détails complets du contenu (titre, image, organisation, etc.)
      - Informations de pagination
      - Tri par défaut : plus récents en premier
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des favoris récupérée avec succès',
    schema: {
      example: {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            contentType: 'ARTICLE',
            contentId: '550e8400-e29b-41d4-a716-446655440002',
            createdAt: '2025-11-28T00:00:00.000Z',
            content: {
              id: '550e8400-e29b-41d4-a716-446655440002',
              title: "Les bienfaits de l'activité physique",
              featuredImage: 'https://res.cloudinary.com/...',
              organization: {
                id: '550e8400-e29b-41d4-a716-446655440003',
                name: 'Hôpital Laquintinie',
                logo: 'https://res.cloudinary.com/...',
              },
            },
          },
        ],
        meta: {
          total: 25,
          page: 1,
          limit: 20,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async findAll(
    @Query() query: QueryBookmarkDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookmarkService.findAll(userId, query);
  }

  // =====================================
  // 🔍 VÉRIFIER SI UN CONTENU EST EN FAVORI (Protégé)
  // =====================================
  @Get('check/:contentType/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier si un contenu est en favori',
    description: `
      Vérifier si un contenu spécifique est dans les favoris de l'utilisateur.
      
      **Cas d'usage :**
      - Afficher un cœur rempli/vidé sur les cartes de contenu
      - Activer/désactiver le bouton "Ajouter aux favoris"
      - Éviter les appels API inutiles
      
      **Réponse :**
      - isBookmarked : true/false
      - bookmarkId : ID du favori si existant (pour suppression rapide)
    `,
  })
  @ApiParam({
    name: 'contentType',
    description: 'Type de contenu',
    enum: ContentType,
  })
  @ApiParam({
    name: 'contentId',
    description: 'ID du contenu',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du favori',
    schema: {
      example: {
        isBookmarked: true,
        bookmarkId: '550e8400-e29b-41d4-a716-446655440000',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async isBookmarked(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookmarkService.isBookmarked(
      userId,
      contentType as ContentType,
      contentId,
    );
  }

  // =====================================
  // 📊 STATISTIQUES DES FAVORIS (Protégé)
  // =====================================
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Statistiques des favoris',
    description: `
      Récupérer les statistiques des favoris de l'utilisateur.
      
      **Inclus dans la réponse :**
      - total : Nombre total de favoris
      - announcements : Nombre d'annonces en favori
      - articles : Nombre d'articles en favori
      - recentBookmarks : 5 favoris les plus récents
      
      **Cas d'usage :**
      - Dashboard utilisateur avec ses statistiques
      - Badge sur le profil utilisateur
      - Widget "Mes favoris récents"
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    schema: {
      example: {
        total: 25,
        announcements: 8,
        articles: 17,
        recentBookmarks: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            content: {
              id: '550e8400-e29b-41d4-a716-446655440002',
              title: "Les bienfaits de l'activité physique",
              featuredImage: 'https://res.cloudinary.com/...',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getBookmarkStats(@CurrentUser('sub') userId: string) {
    return this.bookmarkService.getBookmarkStats(userId);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN FAVORI (Protégé)
  // =====================================
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un favori',
    description: `
      Supprimer un favori spécifique par son ID.
      
      **Sécurité :**
      - Un utilisateur ne peut supprimer que ses propres favoris
      - Vérification de l'appartenance du favori
      
      **Cas d'usage :**
      - Bouton "Retirer des favoris" sur la page de détails
      - Liste de favoris avec bouton de suppression
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID du favori à supprimer',
  })
  @ApiResponse({
    status: 200,
    description: 'Favori supprimé avec succès',
    schema: {
      example: {
        message: 'Favori supprimé avec succès',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Favori non trouvé',
  })
  async remove(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.bookmarkService.remove(id, userId);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN FAVORI PAR CONTENU (Protégé)
  // =====================================
  @Delete('content/:contentType/:contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un favori par contenu',
    description: `
      Supprimer un favori en utilisant le type et l'ID du contenu.
      
      **Avantage :**
      - Pas besoin de connaître l'ID du favori
      - Plus simple pour les clients frontend
      
      **Cas d'usage :**
      - Bouton toggle "Ajouter/Retirer des favoris" sur les cartes
      - Action directe depuis la page de contenu
    `,
  })
  @ApiParam({
    name: 'contentType',
    description: 'Type de contenu',
    enum: ContentType,
  })
  @ApiParam({
    name: 'contentId',
    description: 'ID du contenu',
  })
  @ApiResponse({
    status: 200,
    description: 'Favori supprimé avec succès',
    schema: {
      example: {
        message: 'Favori supprimé avec succès',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Aucun favori trouvé pour ce contenu',
  })
  async removeByContent(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.bookmarkService.removeByContent(
      userId,
      contentType as ContentType,
      contentId,
    );
  }
}
