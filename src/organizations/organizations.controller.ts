/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/organizations/organizations.controller.ts

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
  Req,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { LoginOrganizationDto } from './dto/login-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationType, OrganizationStatus } from '@prisma/client';
import { JwtOrganizationAuthGuard } from '../common/guards/jwt-auth.guard';
import type { Request } from 'express';
import { SearchOrganizationsDto } from './dto/search-organizations.dto';

/**
 * 🏥 ORGANIZATIONS CONTROLLER
 *
 * Gère toutes les routes liées aux organisations.
 *
 * ROUTES PUBLIQUES :
 * - POST /organizations/register (inscription)
 * - POST /organizations/login (connexion)
 * - POST /organizations/refresh (rafraîchir token)
 * - GET /organizations (liste)
 * - GET /organizations/:id (détails)
 *
 * ROUTES PROTÉGÉES (ORGANIZATION) :
 * - GET /organizations/me (profil)
 * - PATCH /organizations/me (modifier profil)
 * - PATCH /organizations/me/password (changer mot de passe)
 * - POST /organizations/me/members (ajouter membre)
 * - GET /organizations/me/members (liste membres)
 * - PATCH /organizations/me/members/:id (modifier membre)
 * - DELETE /organizations/me/members/:id (supprimer membre)
 */
@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtOrganizationAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // =====================================
  // 📝 INSCRIPTION (PUBLIC)
  // =====================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Inscription d'une organisation (Public)",
    description: `
      Créer un compte pour une organisation (hôpital, ONG, clinique, etc.).
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Types d'organisations supportés :**
      - HOSPITAL_PUBLIC : Hôpital public
      - HOSPITAL_PRIVATE : Hôpital privé
      - CLINIC : Clinique
      - HEALTH_CENTER : Centre de santé
      - DISPENSARY : Dispensaire
      - MINISTRY : Ministère de la Santé
      - NGO : ONG (Croix-Rouge, MSF, etc.)
      - FOUNDATION : Fondation
      - RESEARCH_CENTER : Centre de recherche
      
      **Workflow d'inscription :**
      1. L'organisation s'inscrit avec ses informations
      2. Status initial : PENDING (en attente de validation)
      3. Upload du document d'agrément (licenseDocument)
      4. Un administrateur VALIDATOR vérifie et active le compte
      5. Status passe à ACTIVE → L'organisation peut publier du contenu
      
      **Documents requis :**
      - Numéro d'enregistrement (RC, agrément ministère)
      - Document d'agrément (PDF) uploadé via /uploads/document
      
      **Coordonnées GPS :**
      - Optionnelles lors de l'inscription
      - Peuvent être ajoutées via geocoding après inscription
      - Si fournies, une localisation est créée automatiquement
      
      **Après inscription :**
      - L'organisation reçoit un accessToken et refreshToken
      - Elle peut compléter son profil
      - Elle doit attendre la validation admin pour publier
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Inscription réussie',
    schema: {
      example: {
        success: true,
        statusCode: 201,
        data: {
          organization: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Hôpital Laquintinie',
            email: 'contact@laquintinie.cm',
            type: 'HOSPITAL_PUBLIC',
            phone: '+237699999999',
            address: 'Rue de la République, Deido',
            city: 'Douala',
            region: 'Littoral',
            status: 'PENDING',
            isVerified: false,
            createdAt: '2025-11-28T00:00:00.000Z',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        timestamp: '2025-11-28T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 409,
    description: "Email ou numéro d'enregistrement déjà utilisé",
  })
  async register(
    @Body() registerDto: RegisterOrganizationDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.organizationsService.register(
      registerDto,
      ipAddress,
      userAgent,
    );
  }

  // =====================================
  // 🔐 CONNEXION (PUBLIC)
  // =====================================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Connexion d'une organisation (Public)",
    description: `
      Connexion d'une organisation avec email et mot de passe.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Vérifications effectuées :**
      - Email et mot de passe valides
      - Organisation non supprimée (status != DELETED)
      - Organisation non suspendue (status != SUSPENDED)
      
      **Réponse :**
      - Informations de l'organisation
      - Access Token (validité : 15 minutes)
      - Refresh Token (validité : 7 jours)
      
      **Note :** Les organisations avec status PENDING peuvent se connecter
      mais ne peuvent pas publier de contenu tant qu'elles ne sont pas vérifiées.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
  })
  @ApiResponse({
    status: 401,
    description: 'Email ou mot de passe incorrect',
  })
  @ApiResponse({
    status: 403,
    description: 'Compte suspendu ou supprimé',
  })
  async login(@Body() loginDto: LoginOrganizationDto, @Req() req: Request) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.organizationsService.login(loginDto, ipAddress, userAgent);
  }

  // =====================================
  // 🔄 REFRESH TOKEN (PUBLIC)
  // =====================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rafraîchir les tokens (Public)',
    description: `
      Obtenir de nouveaux tokens en utilisant le refresh token.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Cas d'usage :**
      - L'access token a expiré (après 15 minutes)
      - Prolonger la session sans redemander les identifiants
      
      **Fonctionnement :**
      1. Envoyer le refresh token dans le body
      2. Le système vérifie sa validité
      3. Génère un nouvel access token et refresh token
      4. Met à jour la session en base de données
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens rafraîchis avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        timestamp: '2025-11-28T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalide ou expiré',
  })
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    return this.organizationsService.refreshTokens(refreshToken);
  }

  // =====================================
  // 👤 PROFIL DE L'ORGANISATION CONNECTÉE
  // =====================================

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Profil de l'organisation connectée",
    description: `
      Récupérer le profil complet de l'organisation connectée.
      
      **Authentification requise :** Access Token dans le header.
      
      **Inclus dans la réponse :**
      - Informations complètes de l'organisation
      - Liste des membres actifs
      - Liste des services médicaux
      - Statistiques (annonces, articles publiés)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    type: OrganizationEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée',
  })
  async getProfile(@CurrentUser('sub') organizationId: string) {
    return this.organizationsService.getProfile(organizationId);
  }

  // =====================================
  // ✏️ METTRE À JOUR LE PROFIL
  // =====================================

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mettre à jour le profil',
    description: `
      Modifier les informations de l'organisation connectée.
      
      **Champs modifiables :**
      - name, phone, whatsapp
      - description, website
      - logo, coverImage (URLs Cloudinary)
      - address, city, region, latitude, longitude
      - openingHours, emergencyAvailable, insuranceAccepted
      
      **PATCH partiel :** Seuls les champs fournis seront mis à jour.
      
      **Champs NON modifiables :**
      - email (identifiant unique)
      - password (route dédiée : PATCH /me/password)
      - registrationNumber (immuable)
      - status, isVerified (gérés par admin)
      
      **Localisation :**
      Si les coordonnées GPS changent, la localisation est automatiquement
      mise à jour ou créée si elle n'existait pas.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
    type: OrganizationEntity,
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
    status: 409,
    description: 'Téléphone déjà utilisé',
  })
  async updateProfile(
    @CurrentUser('sub') organizationId: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateProfile(organizationId, updateDto);
  }

  // =====================================
  // 🔑 CHANGER LE MOT DE PASSE
  // =====================================

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Changer le mot de passe',
    description: `
      Changer le mot de passe de l'organisation connectée.
      
      **Vérifications :**
      - Mot de passe actuel correct
      - Nouveau mot de passe différent de l'ancien
      - Nouveau mot de passe respecte les règles de sécurité
      
      **Règles de sécurité :**
      - Minimum 8 caractères
      - Au moins 1 majuscule
      - Au moins 1 minuscule
      - Au moins 1 chiffre
      
      **Sécurité :**
      Après changement, toutes les sessions actives restent valides.
      Pour plus de sécurité, vous pouvez implémenter l'invalidation
      des anciennes sessions.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe changé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Mot de passe changé avec succès',
        },
        timestamp: '2025-11-28T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Mot de passe actuel incorrect ou nouveau mot de passe invalide',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async updatePassword(
    @CurrentUser('sub') organizationId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.organizationsService.updatePassword(
      organizationId,
      updatePasswordDto,
    );
  }

  // =====================================
  // 📋 LISTE DES ORGANISATIONS (PUBLIC)
  // =====================================

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liste des organisations (Public)',
    description: `
      Liste paginée des organisations avec filtres.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Filtres disponibles :**
      - type : Type d'organisation (HOSPITAL_PUBLIC, NGO, etc.)
      - city : Ville (recherche partielle insensible à la casse)
      - region : Région (recherche partielle insensible à la casse)
      - isVerified : Organisations vérifiées uniquement
      - status : Statut (ACTIVE, PENDING, etc.)
      - search : Recherche par nom ou description
      
      **Par défaut :**
      - Seules les organisations ACTIVE et VERIFIED sont affichées
      - Tri : Vérifiées → Meilleures notes → Plus récentes
      - Pagination : 20 par page, max 100
      
      **Cas d'usage :**
      - Afficher tous les hôpitaux : ?type=HOSPITAL_PUBLIC
      - Hôpitaux à Douala : ?city=Douala&type=HOSPITAL_PUBLIC
      - Rechercher "Laquintinie" : ?search=Laquintinie
      - ONGs vérifiées : ?type=NGO&isVerified=true
    `,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Critère de tri (name, rating)',
    enum: ['name', 'rating'], // 'distance' n'est pas listé car non supporté sans GPS ici
    example: 'rating',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre par page (max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: OrganizationType,
    description: 'Filtrer par type',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filtrer par ville',
    example: 'Douala',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    type: String,
    description: 'Filtrer par région',
    example: 'Littoral',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: Boolean,
    description: 'Organisations vérifiées uniquement',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrganizationStatus,
    description: 'Filtrer par statut',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Recherche par nom ou description',
    example: 'Laquintinie',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste récupérée avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Hôpital Laquintinie',
              type: 'HOSPITAL_PUBLIC',
              city: 'Douala',
              region: 'Littoral',
              isVerified: true,
              rating: 4.5,
              totalReviews: 128,
            },
          ],
          meta: {
            total: 45,
            page: 1,
            limit: 20,
            totalPages: 3,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        },
        timestamp: '2025-11-28T00:00:00.000Z',
      },
    },
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type', new ParseEnumPipe(OrganizationType, { optional: true }))
    type?: OrganizationType,
    @Query('city') city?: string,
    @Query('region') region?: string,
    @Query('isVerified', new ParseBoolPipe({ optional: true }))
    isVerified?: boolean,
    @Query('status', new ParseEnumPipe(OrganizationStatus, { optional: true }))
    status?: OrganizationStatus,
    @Query('search') search?: string,
  ) {
    return this.organizationsService.findAll(
      page,
      limit,
      type,
      city,
      region,
      isVerified,
      status,
      search,
    );
  }

  @Public()
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recherche avancée des organisations (Full-Text)',
    description: `
    Recherche performante des organisations avec PostgreSQL Full-Text Search (tsvector)
    et cache Redis.

    **Fonctionnalités :**
    - Recherche textuelle avancée (nom, description)
    - Classement par pertinence (rank)
    - Filtres ville / région
    - Cache Redis (5 minutes)

    **Exemples :**
    - /organizations/search?q=hôpital
    - /organizations/search?q=clinique&city=Douala
    - /organizations/search?q=laquintinie&page=2
  `,
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'region', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche',
  })
  async searchOrganizations(@Query() query: SearchOrganizationsDto) {
    return this.organizationsService.searchOrganizations(query);
  }

  // =====================================
  // 🔍 DÉTAILS D'UNE ORGANISATION (PUBLIC)
  // =====================================

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Détails d'une organisation (Public)",
    description: `
      Récupérer les détails complets d'une organisation.
      
      **ROUTE PUBLIQUE :** Accessible sans authentification.
      
      **Inclus dans la réponse :**
      - Informations complètes
      - Membres actifs
      - Services médicaux avec spécialités
      - Statistiques
      
      **Restrictions :**
      - Seules les organisations VERIFIED sont accessibles
      - Les organisations DELETED ne sont pas visibles
    `,
  })
  @ApiParam({
    name: 'id',
    description: "UUID de l'organisation",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Organisation trouvée',
    type: OrganizationEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Organisation non trouvée',
  })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  // =====================================
  // 👥 GESTION DES MEMBRES
  // =====================================

  @Post('me/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajouter un membre',
    description: `
      Ajouter un membre à l'organisation connectée.
      
      **Cas d'usage :**
      - Ajouter un médecin, infirmier, administrateur
      - Gérer l'équipe de l'organisation
      
      **Contrainte :**
      - Un email unique par organisation
      - Le même email peut exister dans plusieurs organisations
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Membre ajouté avec succès',
    type: OrganizationMemberEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 409,
    description: 'Email déjà utilisé dans cette organisation',
  })
  async addMember(
    @CurrentUser('sub') organizationId: string,
    @Body() createMemberDto: CreateMemberDto,
  ) {
    return this.organizationsService.addMember(organizationId, createMemberDto);
  }

  @Get('me/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liste des membres',
    description: `
      Récupérer la liste des membres actifs de l'organisation.
      
      **Inclus :**
      - Prénom, nom, email, téléphone, poste
      - Uniquement les membres actifs (isActive = true)
      - Triés par date de création (plus récents en premier)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des membres',
    type: [OrganizationMemberEntity],
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMembers(@CurrentUser('sub') organizationId: string) {
    return this.organizationsService.getMembers(organizationId);
  }

  @Patch('me/members/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Modifier un membre',
    description: `
      Mettre à jour les informations d'un membre.
      
      **Champs modifiables :**
      - firstName, lastName, email, phone, position
      - isActive (pour désactiver/activer)
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID du membre',
  })
  @ApiResponse({
    status: 200,
    description: 'Membre mis à jour avec succès',
    type: OrganizationMemberEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Membre non trouvé',
  })
  @ApiResponse({
    status: 409,
    description: 'Email déjà utilisé',
  })
  async updateMember(
    @CurrentUser('sub') organizationId: string,
    @Param('id') memberId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.organizationsService.updateMember(
      organizationId,
      memberId,
      updateMemberDto,
    );
  }

  @Delete('me/members/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un membre',
    description: `
      Désactiver un membre (soft delete via isActive = false).
      
      **Note :** Le membre n'est pas supprimé physiquement mais désactivé.
      Il peut être réactivé en mettant isActive = true via PATCH.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID du membre',
  })
  @ApiResponse({
    status: 200,
    description: 'Membre désactivé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Membre désactivé avec succès',
        },
        timestamp: '2025-11-28T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 404,
    description: 'Membre non trouvé',
  })
  async removeMember(
    @CurrentUser('sub') organizationId: string,
    @Param('id') memberId: string,
  ) {
    return this.organizationsService.removeMember(organizationId, memberId);
  }
}
