/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/uploads/uploads.service.ts

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadImageDto } from './dto/upload-image.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { MediaEntity } from './entities/media.entity';
import { CloudinaryResponse } from './interfaces/cloudinary-response.interface';
import { ContentType, MediaStatus, UserType } from '@prisma/client';
import * as path from 'path';
import { PrismaService } from 'prisma/prisma.service';

/**
 * ☁️ UPLOADS SERVICE
 *
 * Gère tous les uploads de fichiers vers Cloudinary.
 *
 * FONCTIONNALITÉS :
 * - Upload d'images (avatars, covers, articles, etc.)
 * - Upload de documents (PDF, Word, etc.)
 * - Génération automatique de thumbnails
 * - Optimisation et compression
 * - Validation des formats et tailles
 * - Soft delete avec suppression Cloudinary
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadFolder: string;

  // 🎨 CONFIGURATIONS PAR TYPE DE CONTENU
  private readonly imageConfig = {
    maxSize: 5 * 1024 * 1024, // 5 MB
    allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  };

  private readonly documentConfig = {
    maxSize: 10 * 1024 * 1024, // 10 MB
    allowedFormats: ['pdf', 'doc', 'docx'],
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // 📁 Récupérer le dossier d'upload depuis la config
    this.uploadFolder = this.configService.get<string>(
      'cloudinary.uploadFolder',
    )!;

    // ☁️ Configurer Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
      secure: true,
    });
  }

  // =====================================
  // 🖼️ UPLOAD IMAGE
  // =====================================

  /**
   * Upload une image vers Cloudinary
import { PrismaService } from '../prisma/prisma.service';
   *
   * PROCESSUS :
   * 1. Validation du fichier (taille, format)
   * 2. Upload vers Cloudinary avec transformations
   * 3. Génération de thumbnail
   * 4. Enregistrement en base de données
   *
   * @param file - Fichier Express.Multer
   * @param uploadImageDto - Métadonnées (contentType, contentId)
   * @param uploaderId - ID de celui qui upload (User ou Organization)
   */
  async uploadImage(
    file: Express.Multer.File,
    uploadImageDto: UploadImageDto,
    uploaderId: string,
    uploaderType: UserType = UserType.USER,
  ): Promise<MediaEntity> {
    // ✅ VALIDATION DU FICHIER
    this.validateImageFile(file);

    // 📁 Déterminer le sous-dossier selon le type de contenu
    const subfolder = this.getSubfolder(uploadImageDto.contentType);
    const folder = `${this.uploadFolder}/${subfolder}`;

    try {
      // ☁️ UPLOAD VERS CLOUDINARY
      const uploadResult = await this.uploadToCloudinary(file, {
        folder,
        resource_type: 'image',
        format: 'jpg', // ✅ Convertir en JPG pour optimisation
        transformation: [
          {
            quality: 'auto:good', // ✅ Compression automatique
            fetch_format: 'auto', // ✅ Format optimal (WebP si supporté)
          },
        ],
      });

      // 🖼️ GÉNÉRER LA THUMBNAIL
      const thumbnailUrl = this.generateThumbnailUrl(uploadResult.public_id);

      // 💾 ENREGISTRER EN BASE DE DONNÉES
      const media = await this.prisma.media.create({
        data: {
          uploadedBy: uploaderId,
          uploaderType,
          contentType: uploadImageDto.contentType,
          contentId: uploadImageDto.contentId || null,
          fileName: `${path.parse(file.originalname).name}_${Date.now()}.jpg`,
          originalFileName: file.originalname,
          mimeType:
            uploadResult.format === 'jpg'
              ? 'image/jpeg'
              : `image/${uploadResult.format}`,
          fileSize: uploadResult.bytes,
          url: uploadResult.secure_url,
          thumbnailUrl,
          width: uploadResult.width,
          height: uploadResult.height,
          cloudinaryPublicId: uploadResult.public_id,
          status: MediaStatus.ACTIVE,
        },
      });

      this.logger.log(`✅ Image uploadée : ${media.id} par ${uploaderId}`);

      return new MediaEntity(media);
    } catch (error) {
      this.logger.error(`❌ Erreur upload image : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'upload de l'image");
    }
  }

  // =====================================
  // 📄 UPLOAD DOCUMENT
  // =====================================

  /**
   * Upload un document vers Cloudinary
   *
   * @param file - Fichier Express.Multer
   * @param uploadDocumentDto - Métadonnées
   * @param uploaderId - ID de celui qui upload (Organization seulement)
   */
  async uploadDocument(
    file: Express.Multer.File,
    uploadDocumentDto: UploadDocumentDto,
    uploaderId: string,
    uploaderType: UserType = UserType.ORGANIZATION,
  ): Promise<MediaEntity> {
    // ✅ VALIDATION DU FICHIER
    this.validateDocumentFile(file);

    // 📁 Sous-dossier pour les documents
    const folder = `${this.uploadFolder}/documents`;

    try {
      // ☁️ UPLOAD VERS CLOUDINARY
      const uploadResult = await this.uploadToCloudinary(file, {
        folder,
        resource_type: 'raw', // ✅ Type "raw" pour les documents
      });

      // 💾 ENREGISTRER EN BASE DE DONNÉES
      const media = await this.prisma.media.create({
        data: {
          uploadedBy: uploaderId,
          uploaderType,
          contentType: uploadDocumentDto.contentType,
          contentId: uploadDocumentDto.contentId || null,
          fileName: `${path.parse(file.originalname).name}_${Date.now()}.${uploadResult.format}`,
          originalFileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: uploadResult.bytes,
          url: uploadResult.secure_url,
          thumbnailUrl: null, // Pas de thumbnail pour les documents
          width: null,
          height: null,
          cloudinaryPublicId: uploadResult.public_id,
          status: MediaStatus.ACTIVE,
        },
      });

      this.logger.log(`✅ Document uploadé : ${media.id} par ${uploaderId}`);

      return new MediaEntity(media);
    } catch (error) {
      this.logger.error(`❌ Erreur upload document : ${error.message}`);
      throw new BadRequestException("Erreur lors de l'upload du document");
    }
  }

  // =====================================
  // 🔍 RÉCUPÉRER UN MÉDIA
  // =====================================

  /**
   * Récupérer les détails d'un média par ID
   */
  async findOne(id: string): Promise<MediaEntity> {
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException(`Média avec l'ID ${id} non trouvé`);
    }

    return new MediaEntity(media);
  }

  // =====================================
  // 📋 MES MÉDIAS
  // =====================================

  /**
   * Récupérer tous les médias uploadés par un utilisateur/organisation
   */
  async findMyUploads(
    uploaderId: string,
    page: number = 1,
    limit: number = 20,
    contentType?: ContentType,
  ) {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 20;

    const skip = (page - 1) * limit;

    const where: any = {
      uploadedBy: uploaderId,
      status: MediaStatus.ACTIVE, // Ne pas montrer les fichiers supprimés
    };

    if (contentType) {
      where.contentType = contentType;
    }

    const [medias, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count({ where }),
    ]);

    const mediaEntities = medias.map((media) => new MediaEntity(media));

    const totalPages = Math.ceil(total / limit);

    return {
      data: mediaEntities,
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
  // 🗑️ SUPPRIMER UN MÉDIA
  // =====================================

  /**
   * Supprimer un média (soft delete + suppression Cloudinary)
   *
   * SÉCURITÉ : Seul le propriétaire peut supprimer
   *
   * @param id - ID du média
   * @param uploaderId - ID de celui qui demande la suppression
   */
  async remove(id: string, uploaderId: string): Promise<{ message: string }> {
    // 🔍 Récupérer le média
    const media = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException(`Média avec l'ID ${id} non trouvé`);
    }

    // ⚠️ VÉRIFICATION : Seul le propriétaire peut supprimer
    if (media.uploadedBy !== uploaderId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres fichiers',
      );
    }

    // Vérifier qu'il n'est pas déjà supprimé
    if (media.status === MediaStatus.DELETED) {
      throw new BadRequestException('Ce média est déjà supprimé');
    }

    try {
      // 🗑️ SUPPRIMER DE CLOUDINARY
      const resourceType = media.mimeType.startsWith('image/')
        ? 'image'
        : 'raw';
      await cloudinary.uploader.destroy(media.cloudinaryPublicId, {
        resource_type: resourceType,
      });

      // 💾 SOFT DELETE EN BASE
      await this.prisma.media.update({
        where: { id },
        data: {
          status: MediaStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`🗑️ Média supprimé : ${id}`);

      return {
        message: 'Média supprimé avec succès',
      };
    } catch (error) {
      this.logger.error(`❌ Erreur suppression média : ${error.message}`);
      throw new BadRequestException('Erreur lors de la suppression du média');
    }
  }

  // =====================================
  // 🔧 MÉTHODES UTILITAIRES PRIVÉES
  // =====================================

  /**
   * Valider un fichier image
   */
  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier la taille
    if (file.size > this.imageConfig.maxSize) {
      throw new BadRequestException(
        `L'image est trop volumineuse. Taille max : ${this.imageConfig.maxSize / 1024 / 1024} MB`,
      );
    }

    // Vérifier le type MIME
    if (!this.imageConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format d'image non supporté. Formats acceptés : ${this.imageConfig.allowedFormats.join(', ')}`,
      );
    }
  }

  /**
   * Valider un fichier document
   */
  private validateDocumentFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    // Vérifier la taille
    if (file.size > this.documentConfig.maxSize) {
      throw new BadRequestException(
        `Le document est trop volumineux. Taille max : ${this.documentConfig.maxSize / 1024 / 1024} MB`,
      );
    }

    // Vérifier le type MIME
    if (!this.documentConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format de document non supporté. Formats acceptés : ${this.documentConfig.allowedFormats.join(', ')}`,
      );
    }
  }

  /**
   * Upload vers Cloudinary (wrapper générique)
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    options: any,
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(error);
          resolve(result as unknown as CloudinaryResponse);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Générer l'URL de la thumbnail
   */
  private generateThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:good' },
      ],
      secure: true,
    });
  }

  /**
   * Déterminer le sous-dossier selon le type de contenu
   */
  private getSubfolder(contentType: ContentType): string {
    const subfolderMap: Record<ContentType, string> = {
      [ContentType.PROFILE]: 'avatars',
      [ContentType.COVER]: 'covers',
      [ContentType.ANNOUNCEMENT]: 'announcements',
      [ContentType.ARTICLE]: 'articles',
      [ContentType.ORGANIZATION]: 'organizations',
      [ContentType.ADVICE]: 'advices',
      [ContentType.COMMENT]: 'comments',
    };

    return subfolderMap[contentType] || 'others';
  }
}
