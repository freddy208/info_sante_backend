// src/categories/categories.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';

/**
 * 📂 CATEGORIES CONTROLLER
 *
 * Gère toutes les routes liées aux catégories de santé.
 *
 * ROUTES PUBLIQUES :
 * - GET /categories (liste)
 * - GET /categories/:id (détails)
 *
 * ROUTES PROTÉGÉES (ADMIN) :
 * - POST /categories (créer)
 * - PATCH /categories/:id (modifier)
 * - DELETE /categories/:id (désactiver)
 * - PATCH /categories/:id/activate (réactiver)
 */
@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // =====================================
  // 📝 CRÉER UNE CATÉGORIE (ADMIN)
  // =====================================

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une catégorie (Admin)',
    description: `
      Créer une nouvelle catégorie de santé.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Fonctionnalités :**
      - Génération automatique du slug depuis le nom
      - Support de la hiérarchie parent/enfant (2 niveaux max)
      - Validation du nom unique
      - Vérification que le parent existe (si fourni)
      
      **Exemples de catégories :**
      - Vaccination
      - Maternité
      - COVID-19
      - Santé Mentale
      
      **Hiérarchie :**
      - Parent : Vaccination
        - Enfant : Vaccination Enfants
        - Enfant : Vaccination Adultes
      
      **IMPORTANT :** Maximum 2 niveaux de hiérarchie (parent → enfant).
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Catégorie créée avec succès',
    type: CategoryEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: [
          'Le nom doit contenir au moins 2 caractères',
          'La couleur doit être au format hexadécimal (ex: #4CAF50)',
        ],
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/categories',
        method: 'POST',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (rôle ADMIN requis)',
  })
  @ApiResponse({
    status: 409,
    description: 'Une catégorie avec ce nom existe déjà',
    schema: {
      example: {
        success: false,
        statusCode: 409,
        error: 'Conflict',
        message: 'Une catégorie avec ce nom existe déjà',
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/categories',
        method: 'POST',
      },
    },
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.create(createCategoryDto);
  }

  // =====================================
  // 📋 LISTE DES CATÉGORIES (PUBLIC)
  // =====================================

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liste des catégories (Public)',
    description: `
      Récupère la liste des catégories avec support de la hiérarchie.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Options de filtrage :**
      - \`page\` : Numéro de la page (défaut : 1)
      - \`limit\` : Nombre de catégories par page (défaut : 50, max : 100)
      - \`isActive\` : Filtrer par statut actif (true/false)
      - \`includeChildren\` : Inclure les sous-catégories (défaut : true)
      - \`parentOnly\` : Uniquement les catégories parentes (défaut : false)
      
      **Par défaut :**
      - Seules les catégories actives sont retournées
      - Les sous-catégories sont incluses
      - Tri par ordre d'affichage puis par nom alphabétique
      
      **Cas d'usage :**
      - Afficher toutes les catégories : \`GET /categories\`
      - Uniquement les catégories parentes : \`GET /categories?parentOnly=true\`
      - Inclure les désactivées : \`GET /categories?isActive=false\`
      - Sans les enfants : \`GET /categories?includeChildren=false\`
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de la page',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de catégories par page (max: 100)',
    example: 50,
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrer par statut actif',
    example: true,
  })
  @ApiQuery({
    name: 'includeChildren',
    required: false,
    type: Boolean,
    description: 'Inclure les sous-catégories',
    example: true,
  })
  @ApiQuery({
    name: 'parentOnly',
    required: false,
    type: Boolean,
    description: 'Uniquement les catégories parentes',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des catégories récupérée avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Vaccination',
              slug: 'vaccination',
              description: 'Toutes les campagnes de vaccination',
              icon: '💉',
              color: '#4CAF50',
              parentId: null,
              order: 1,
              isActive: true,
              announcementsCount: 15,
              articlesCount: 8,
              advicesCount: 3,
              createdAt: '2025-11-27T12:00:00.000Z',
              updatedAt: '2025-11-27T12:00:00.000Z',
              parent: null,
              children: [
                {
                  id: '550e8400-e29b-41d4-a716-446655440001',
                  name: 'Vaccination Enfants',
                  slug: 'vaccination-enfants',
                  description: 'Vaccins pour enfants',
                  icon: '👶',
                  color: '#4CAF50',
                  parentId: '550e8400-e29b-41d4-a716-446655440000',
                  order: 1,
                  isActive: true,
                  announcementsCount: 10,
                  articlesCount: 5,
                  advicesCount: 2,
                  createdAt: '2025-11-27T12:00:00.000Z',
                  updatedAt: '2025-11-27T12:00:00.000Z',
                },
              ],
            },
          ],
          meta: {
            total: 12,
            page: 1,
            limit: 50,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
        timestamp: '2025-11-27T12:00:00.000Z',
      },
    },
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('isActive') isActive?: boolean,
    @Query('includeChildren', new DefaultValuePipe(true), ParseBoolPipe)
    includeChildren?: boolean,
    @Query('parentOnly', new DefaultValuePipe(false), ParseBoolPipe)
    parentOnly?: boolean,
  ) {
    return this.categoriesService.findAll(
      page,
      limit,
      isActive,
      includeChildren,
      parentOnly,
    );
  }

  // =====================================
  // 🔍 DÉTAILS D'UNE CATÉGORIE (PUBLIC)
  // =====================================

  @Public()
  @Get(':identifier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Détails d'une catégorie (Public)",
    description: `
      Récupère les détails d'une catégorie par ID ou slug.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Paramètres acceptés :**
      - UUID : \`550e8400-e29b-41d4-a716-446655440000\`
      - Slug : \`vaccination\`, \`sante-maternelle\`
      
      **Inclus dans la réponse :**
      - Informations complètes de la catégorie
      - Catégorie parente (si sous-catégorie)
      - Liste des sous-catégories actives
      - Statistiques (nombre d'annonces, articles, conseils)
    `,
  })
  @ApiParam({
    name: 'identifier',
    description: 'ID (UUID) ou slug de la catégorie',
    example: 'vaccination',
  })
  @ApiResponse({
    status: 200,
    description: 'Catégorie trouvée',
    type: CategoryEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Catégorie non trouvée',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'Catégorie avec le slug vaccination-xyz non trouvée',
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/categories/vaccination-xyz',
        method: 'GET',
      },
    },
  })
  async findOne(
    @Param('identifier') identifier: string,
  ): Promise<CategoryEntity> {
    return this.categoriesService.findOne(identifier);
  }

  // =====================================
  // ✏️ MODIFIER UNE CATÉGORIE (ADMIN)
  // =====================================

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Modifier une catégorie (Admin)',
    description: `
      Modifier une catégorie existante.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Champs modifiables :**
      - name (régénère automatiquement le slug)
      - description
      - icon
      - color
      - parentId (déplacer dans la hiérarchie)
      - order (ordre d'affichage)
      - isActive (activer/désactiver)
      
      **PATCH partiel :**
      Tous les champs sont optionnels, seuls les champs fournis seront mis à jour.
      
      **Vérifications :**
      - Nom unique (si changé)
      - Parent existe (si changé)
      - Pas de boucle parent/enfant
      - Maximum 2 niveaux de hiérarchie
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la catégorie',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Catégorie mise à jour avec succès',
    type: CategoryEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou boucle parent/enfant',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (rôle ADMIN requis)',
  })
  @ApiResponse({
    status: 404,
    description: 'Catégorie non trouvée',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflit (nom déjà utilisé)',
  })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  // =====================================
  // 🗑️ DÉSACTIVER UNE CATÉGORIE (ADMIN)
  // =====================================

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Désactiver une catégorie (Admin)',
    description: `
      Désactiver une catégorie (soft delete via isActive = false).
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **SOFT DELETE :**
      La catégorie n'est pas supprimée physiquement mais désactivée.
      Elle peut être réactivée ultérieurement avec PATCH /:id/activate.
      
      **Vérifications :**
      - La catégorie ne doit pas avoir de sous-catégories actives
      - Si la catégorie contient du contenu (annonces, articles, conseils),
        elle peut quand même être désactivée pour éviter sa suppression accidentelle
      
      **IMPORTANT :**
      - Les contenus existants (annonces, articles) restent associés
      - La catégorie désactivée n'apparaît plus dans les listes publiques
      - Les sous-catégories doivent être désactivées d'abord
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la catégorie à désactiver',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Catégorie désactivée avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Catégorie désactivée avec succès',
        },
        timestamp: '2025-11-27T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Catégorie déjà désactivée ou contient des sous-catégories actives',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message:
          "Impossible de désactiver cette catégorie car elle contient 3 sous-catégorie(s) active(s). Désactivez d'abord les sous-catégories.",
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/categories/550e8400-e29b-41d4-a716-446655440000',
        method: 'DELETE',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (rôle ADMIN requis)',
  })
  @ApiResponse({
    status: 404,
    description: 'Catégorie non trouvée',
  })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  // =====================================
  // ♻️ RÉACTIVER UNE CATÉGORIE (ADMIN)
  // =====================================

  @Patch(':id/activate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Réactiver une catégorie (Admin)',
    description: `
      Réactiver une catégorie désactivée.
      
      **Permissions requises :** ADMIN ou SUPER_ADMIN
      
      **Fonctionnalité :**
      Passe isActive de false à true pour rendre la catégorie
      à nouveau visible et utilisable.
      
      **Vérifications :**
      - La catégorie doit être désactivée (isActive = false)
      
      **Cas d'usage :**
      - Restaurer une catégorie désactivée par erreur
      - Réactiver une catégorie saisonnière
      - Remettre en service après maintenance
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la catégorie à réactiver',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Catégorie réactivée avec succès',
    type: CategoryEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Catégorie déjà active',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cette catégorie est déjà active',
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/categories/550e8400-e29b-41d4-a716-446655440000/activate',
        method: 'PATCH',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (rôle ADMIN requis)',
  })
  @ApiResponse({
    status: 404,
    description: 'Catégorie non trouvée',
  })
  async activate(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<CategoryEntity> {
    return this.categoriesService.activate(id);
  }
  @Public()
  @Post('dev/recalculate-counts')
  @HttpCode(HttpStatus.OK)
  async recalculate() {
    return this.categoriesService.recalculateAllCounts();
  }
}
