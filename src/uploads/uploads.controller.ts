// src/uploads/uploads.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Body,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { MediaEntity } from './entities/media.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-objectid.pipe';
import { ContentType } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

/**
 * ☁️ UPLOADS CONTROLLER
 *
 * Gère tous les uploads de fichiers (images, documents).
 *
 * ROUTES PUBLIQUES : GET /uploads/:id (détails d'un média)
 * ROUTES PROTÉGÉES : POST, DELETE (authentification requise)
 *
 * SÉCURITÉ :
 * - Validation stricte des formats
 * - Limitation de taille
 * - Seul le propriétaire peut supprimer
 */
@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // =====================================
  // 🖼️ UPLOAD IMAGE
  // =====================================

  @Post('image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file')) // ✅ 'file' = nom du champ dans le form-data
  @ApiConsumes('multipart/form-data') // ✅ Important pour Swagger
  @ApiOperation({
    summary: 'Upload une image',
    description: `
      Upload une image vers Cloudinary.
      
      **Types d'images supportés :**
      - PROFILE : Avatar utilisateur/organisation
      - COVER : Image de couverture
      - ANNOUNCEMENT : Image d'annonce
      - ARTICLE : Image d'article
      - ORGANIZATION : Logo/images organisation
      
      **Formats acceptés :**
      - JPG, JPEG, PNG, WebP, GIF
      
      **Taille max :** 5 MB
      
      **Optimisations automatiques :**
      - Compression intelligente
      - Conversion au format optimal (WebP si supporté)
      - Génération de thumbnail (300x300)
      - Redimensionnement si nécessaire
      
      **IMPORTANT :**
      Le fichier doit être envoyé en \`multipart/form-data\` avec le champ \`file\`.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'contentType'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier image à uploader',
        },
        contentType: {
          type: 'string',
          enum: Object.values(ContentType),
          description: 'Type de contenu',
          example: ContentType.PROFILE,
        },
        contentId: {
          type: 'string',
          description: 'ID du contenu lié (optionnel)',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploadée avec succès',
    type: MediaEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide (format, taille)',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message: "L'image est trop volumineuse. Taille max : 5 MB",
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/uploads/image',
        method: 'POST',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadImageDto: UploadImageDto,
    @CurrentUser('id') uploaderId: string,
  ): Promise<MediaEntity> {
    return this.uploadsService.uploadImage(file, uploadImageDto, uploaderId);
  }

  // =====================================
  // 📄 UPLOAD DOCUMENT
  // =====================================

  @Post('document')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload un document',
    description: `
      Upload un document vers Cloudinary.
      
      **Types de documents supportés :**
      - ORGANIZATION : Document d'agrément, licence
      - ARTICLE : Document joint à un article
      - ANNOUNCEMENT : Document joint à une annonce
      
      **Formats acceptés :**
      - PDF
      - DOC, DOCX
      
      **Taille max :** 10 MB
      
      **Cas d'usage :**
      - Organisations : Upload de licence/agrément lors de l'inscription
      - Articles : Joindre des rapports, études
      - Annonces : Joindre des documents informatifs
      
      **IMPORTANT :**
      Le fichier doit être envoyé en \`multipart/form-data\` avec le champ \`file\`.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'contentType'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier document à uploader',
        },
        contentType: {
          type: 'string',
          enum: Object.values(ContentType),
          description: 'Type de contenu',
          example: ContentType.ORGANIZATION,
        },
        contentId: {
          type: 'string',
          description: 'ID du contenu lié (optionnel)',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploadé avec succès',
    type: MediaEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide (format, taille)',
    schema: {
      example: {
        success: false,
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Format de document non supporté. Formats acceptés : pdf, doc, docx',
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/uploads/document',
        method: 'POST',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @CurrentUser('id') uploaderId: string,
  ): Promise<MediaEntity> {
    return this.uploadsService.uploadDocument(
      file,
      uploadDocumentDto,
      uploaderId,
    );
  }

  // =====================================
  // 📋 MES UPLOADS
  // =====================================

  @Get('my')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mes fichiers uploadés',
    description: `
      Récupère tous les fichiers uploadés par l'utilisateur/organisation connecté(e).
      
      **Pagination :**
      - page : Numéro de la page (défaut : 1)
      - limit : Nombre de fichiers par page (défaut : 20, max : 100)
      
      **Filtres :**
      - contentType : Filtrer par type de contenu (optionnel)
      
      **Tri :**
      - Les fichiers sont triés par date de création (plus récents en premier)
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
    description: 'Nombre de fichiers par page (max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'contentType',
    required: false,
    enum: ContentType,
    description: 'Filtrer par type de contenu',
    example: ContentType.PROFILE,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des fichiers récupérée avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              uploadedBy: '550e8400-e29b-41d4-a716-446655440001',
              contentType: 'PROFILE',
              contentId: null,
              fileName: 'avatar_1732454400.jpg',
              originalFileName: 'mon-avatar.jpg',
              mimeType: 'image/jpeg',
              fileSize: 245678,
              url: 'https://res.cloudinary.com/duqsblvzm/image/upload/v1234567890/...',
              thumbnailUrl:
                'https://res.cloudinary.com/duqsblvzm/image/upload/c_thumb,w_300,h_300/...',
              width: 1920,
              height: 1080,
              cloudinaryPublicId: 'fichier_infos_sante_app_prod/avatars/abc123',
              status: 'ACTIVE',
              createdAt: '2025-11-24T12:00:00.000Z',
            },
          ],
          meta: {
            total: 15,
            page: 1,
            limit: 20,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyUploads(
    @CurrentUser('id') uploaderId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('contentType') contentType?: ContentType,
  ) {
    return this.uploadsService.findMyUploads(
      uploaderId,
      page,
      limit,
      contentType,
    );
  }

  // =====================================
  // 🔍 DÉTAILS D'UN MÉDIA (PUBLIC)
  // =====================================

  @Public() // ✅ Route publique
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Détails d'un média (Public)",
    description: `
      Récupère les détails d'un fichier uploadé par son ID.
      
      **ROUTE PUBLIQUE :**
      Accessible sans authentification.
      
      **Cas d'usage :**
      - Afficher les images dans les articles/annonces
      - Vérifier l'existence d'un fichier
      - Récupérer les URLs des thumbnails
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID du média',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Média trouvé',
    type: MediaEntity,
  })
  @ApiResponse({
    status: 404,
    description: 'Média non trouvé',
    schema: {
      example: {
        success: false,
        statusCode: 404,
        error: 'Not Found',
        message:
          "Média avec l'ID 550e8400-e29b-41d4-a716-446655440000 non trouvé",
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/uploads/550e8400-e29b-41d4-a716-446655440000',
        method: 'GET',
      },
    },
  })
  async findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<MediaEntity> {
    return this.uploadsService.findOne(id);
  }

  // =====================================
  // 🗑️ SUPPRIMER UN MÉDIA
  // =====================================

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer un média',
    description: `
      Supprime un fichier uploadé (soft delete + suppression Cloudinary).
      
      **SÉCURITÉ :**
      Seul le propriétaire du fichier peut le supprimer.
      
      **Processus de suppression :**
      1. Vérification que le fichier existe
      2. Vérification que l'utilisateur est le propriétaire
      3. Suppression du fichier sur Cloudinary
      4. Soft delete en base de données (status = DELETED)
      
      **IMPORTANT :**
      Le fichier n'est pas supprimé physiquement de la base de données,
      mais il ne sera plus accessible et sera marqué comme supprimé.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID du média à supprimer',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Média supprimé avec succès',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        data: {
          message: 'Média supprimé avec succès',
        },
        timestamp: '2025-11-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Média non trouvé',
  })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé (pas le propriétaire)',
    schema: {
      example: {
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Vous ne pouvez supprimer que vos propres fichiers',
        timestamp: '2025-11-24T12:00:00.000Z',
        path: '/api/v1/uploads/550e8400-e29b-41d4-a716-446655440000',
        method: 'DELETE',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Média déjà supprimé',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') uploaderId: string,
  ) {
    return this.uploadsService.remove(id, uploaderId);
  }
}
