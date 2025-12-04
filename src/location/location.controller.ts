// src/location/location.controller.ts

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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LocationService } from './location.service';
import { GeocodeDto } from './dto/geocode.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationEntity } from './entities/location.entity';
import { GeocodeResultEntity } from './entities/geocode-result.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

/**
 * 📍 LOCATION CONTROLLER
 *
 * Gère toutes les routes liées à la géolocalisation.
 *
 * ROUTES PUBLIQUES :
 * - GET /location/geocode (adresse → coordonnées)
 * - GET /location/reverse-geocode (coordonnées → adresse)
 * - GET /location/:contentId (détails localisation)
 *
 * ROUTES PROTÉGÉES :
 * - POST /location (créer)
 * - PATCH /location/:contentId (modifier)
 * - DELETE /location/:contentId (supprimer)
 */
@ApiTags('Location')
@Controller('location')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // =====================================
  // 🌍 GEOCODING (PUBLIC)
  // =====================================

  @Public()
  @Get('geocode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Géocoder une adresse (Public)',
    description: `
      Convertir une adresse en coordonnées GPS (latitude, longitude).
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Fonctionnalité :**
      Utilise l'API OpenCage pour trouver les coordonnées GPS d'une adresse.
      
      **Paramètres :**
      - Recherche limitée au Cameroun (countrycode: cm)
      - Résultats en français
      - Maximum 5 résultats retournés
      
      **Cas d'usage :**
      - Vérifier une adresse avant de créer une annonce
      - Convertir l'adresse d'une organisation en coordonnées
      - Suggestion d'adresses avec coordonnées
      
      **Exemples de recherche :**
      - "Douala" → Plusieurs résultats (quartiers, rues)
      - "Rue de la République, Douala" → Résultat précis
      - "Hôpital Laquintinie" → Localisation de l'hôpital
      
      **NOTE :** Plus l'adresse est précise, meilleur sera le résultat.
    `,
  })
  @ApiQuery({
    name: 'address',
    description: 'Adresse à géocoder',
    example: 'Rue de la République, Douala, Cameroun',
  })
  @ApiResponse({
    status: 200,
    description: 'Géocodage réussi',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: [
          {
            formattedAddress:
              'Rue de la République, Akwa, Douala, Littoral, Cameroun',
            latitude: 4.0511,
            longitude: 9.7679,
            city: 'Douala',
            region: 'Littoral',
            country: 'Cameroun',
            countryCode: 'CM',
            postcode: '4032',
            confidence: 9,
          },
          {
            formattedAddress:
              'Rue de la République, Bonapriso, Douala, Littoral, Cameroun',
            latitude: 4.0598,
            longitude: 9.7012,
            city: 'Douala',
            region: 'Littoral',
            country: 'Cameroun',
            countryCode: 'CM',
            confidence: 8,
          },
        ],
        timestamp: '2025-11-27T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Aucune localisation trouvée',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message: 'Aucune localisation trouvée pour cette adresse',
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/location/geocode',
        method: 'GET',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Quota API dépassé',
  })
  async geocode(
    @Query() geocodeDto: GeocodeDto,
  ): Promise<GeocodeResultEntity[]> {
    return this.locationService.geocode(geocodeDto);
  }

  // =====================================
  // 🔄 REVERSE GEOCODING (PUBLIC)
  // =====================================

  @Public()
  @Get('reverse-geocode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Géocodage inverse (Public)',
    description: `
      Convertir des coordonnées GPS en adresse.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Fonctionnalité :**
      Utilise l'API OpenCage pour trouver l'adresse correspondant
      à des coordonnées GPS (latitude, longitude).
      
      **Cas d'usage :**
      - Obtenir l'adresse depuis la position GPS de l'utilisateur
      - Vérifier l'adresse d'un point sur une carte
      - Remplir automatiquement les champs adresse/ville/région
      
      **Exemple :**
      - Latitude: 4.0511, Longitude: 9.7679
      - → "Rue de la République, Akwa, Douala, Littoral, Cameroun"
      
      **NOTE :** Les coordonnées doivent être au Cameroun pour de meilleurs résultats.
    `,
  })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude (entre -90 et 90)',
    example: 4.0511,
    type: Number,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude (entre -180 et 180)',
    example: 9.7679,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Géocodage inverse réussi',
    type: GeocodeResultEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Aucune adresse trouvée',
  })
  async reverseGeocode(
    @Query() reverseGeocodeDto: ReverseGeocodeDto,
  ): Promise<GeocodeResultEntity> {
    return this.locationService.reverseGeocode(reverseGeocodeDto);
  }

  // =====================================
  // 📝 CRÉER UNE LOCALISATION
  // =====================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une localisation',
    description: `
      Créer une localisation en base de données pour un contenu.
      
      **Permissions requises :** Authentification
      
      **Fonctionnalité :**
      Enregistre une localisation (adresse + coordonnées) pour un contenu
      (annonce, organisation, etc.).
      
      **WORKFLOW RECOMMANDÉ :**
      1. L'utilisateur saisit une adresse
      2. Appeler GET /location/geocode pour obtenir les coordonnées
      3. L'utilisateur sélectionne le bon résultat
      4. Appeler POST /location avec toutes les données
      
      **Types de contenu supportés :**
      - ANNOUNCEMENT : Localisation d'une annonce/campagne
      - ORGANIZATION : Adresse d'une organisation (hôpital, ONG)
      
      **IMPORTANT :**
      - Une seule localisation par contenu (contentId unique)
      - Les coordonnées doivent être validées via geocode d'abord
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Localisation créée avec succès',
    type: LocationEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou localisation déjà existante',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: 'Une localisation existe déjà pour ce contenu',
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/location',
        method: 'POST',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async create(
    @Body() createLocationDto: CreateLocationDto,
  ): Promise<LocationEntity> {
    return this.locationService.create(createLocationDto);
  }

  // =====================================
  // 🔍 DÉTAILS D'UNE LOCALISATION (PUBLIC)
  // =====================================

  @Public()
  @Get(':contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Détails d'une localisation (Public)",
    description: `
      Récupérer une localisation par contentId.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Cas d'usage :**
      - Afficher la localisation d'une annonce
      - Afficher l'adresse d'une organisation
      - Obtenir les coordonnées pour afficher sur une carte
      
      **Paramètre :**
      - contentId : UUID du contenu (announcement, organization)
    `,
  })
  @ApiParam({
    name: 'contentId',
    description: 'UUID du contenu',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Localisation trouvée',
    type: LocationEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Localisation non trouvée',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message:
          'Localisation pour le contenu 550e8400-e29b-41d4-a716-446655440000 non trouvée',
        timestamp: '2025-11-27T12:00:00.000Z',
        path: '/api/v1/location/550e8400-e29b-41d4-a716-446655440000',
        method: 'GET',
      },
    },
  })
  async findByContentId(
    @Param('contentId') contentId: string,
  ): Promise<LocationEntity> {
    return this.locationService.findByContentId(contentId);
  }

  // =====================================
  // ✏️ MODIFIER UNE LOCALISATION
  // =====================================

  @Patch(':contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Modifier une localisation',
    description: `
      Mettre à jour une localisation existante.
      
      **Permissions requises :** Authentification
      
      **Champs modifiables :**
      - address
      - city
      - region
      - latitude
      - longitude
      - placeId
      - formattedAddress
      - additionalInfo
      
      **PATCH partiel :**
      Tous les champs sont optionnels, seuls les champs fournis seront mis à jour.
      
      **NOTE :**
      - contentType et contentId ne peuvent pas être modifiés
      - Si l'adresse change, pensez à mettre à jour les coordonnées aussi
    `,
  })
  @ApiParam({
    name: 'contentId',
    description: 'UUID du contenu',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Localisation mise à jour avec succès',
    type: LocationEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Localisation non trouvée',
  })
  async update(
    @Param('contentId') contentId: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<LocationEntity> {
    return this.locationService.update(contentId, updateLocationDto);
  }

  // =====================================
  // 🗑️ SUPPRIMER UNE LOCALISATION
  // =====================================

  @Delete(':contentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer une localisation',
    description: `
      Supprimer une localisation de la base de données.
      
      **Permissions requises :** Authentification
      
      **ATTENTION :**
      - Suppression physique (pas de soft delete)
      - Action irréversible
      - À utiliser avec précaution
      
      **Cas d'usage :**
      - Supprimer la localisation avant de supprimer le contenu
      - Retirer une localisation erronée
      
      **NOTE :**
      Si vous supprimez un contenu (annonce, organisation),
      la localisation sera automatiquement supprimée (onDelete: Cascade).
    `,
  })
  @ApiParam({
    name: 'contentId',
    description: 'UUID du contenu',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Localisation supprimée avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Localisation supprimée avec succès',
        },
        timestamp: '2025-11-27T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Localisation non trouvée',
  })
  async remove(@Param('contentId') contentId: string) {
    return this.locationService.remove(contentId);
  }
}
