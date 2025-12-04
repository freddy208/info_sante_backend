// src/uploads/uploads.module.ts

import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { CloudinaryProvider } from './utils/cloudinary.config';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaModule } from 'prisma/prisma.module';

/**
 * ☁️ UPLOADS MODULE
 *
 * Module de gestion des uploads de fichiers vers Cloudinary.
 *
 * FONCTIONNALITÉS :
 * - Upload d'images (avatars, covers, articles, annonces)
 * - Upload de documents (PDF, Word)
 * - Génération automatique de thumbnails
 * - Optimisation et compression
 * - Soft delete avec suppression Cloudinary
 *
 * DÉPENDANCES :
 * - PrismaModule : Accès à la base de données
 * - CloudinaryProvider : Configuration SDK Cloudinary
 *
 * SÉCURITÉ :
 * - Validation stricte des formats
 * - Limitation de taille
 * - Seul le propriétaire peut supprimer
 */
@Module({
  imports: [
    PrismaModule, // ✅ Accès à la base de données
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    CloudinaryProvider, // ✅ Configuration Cloudinary
    PrismaService,
  ],
  exports: [UploadsService], // ✅ Exporté pour être utilisé dans d'autres modules
})
export class UploadsModule {}
