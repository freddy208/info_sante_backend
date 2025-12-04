// src/location/location.module.ts

import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaModule } from 'prisma/prisma.module';

/**
 * 📍 LOCATION MODULE
 *
 * Module de gestion de la géolocalisation.
 *
 * FONCTIONNALITÉS :
 * - Geocoding (adresse → coordonnées) via OpenCage
 * - Reverse Geocoding (coordonnées → adresse)
 * - CRUD localisations en base de données
 * - Support des annonces et organisations
 *
 * DÉPENDANCES :
 * - PrismaModule : Accès à la base de données
 * - OpenCage API : Service de géocodage externe
 *
 * ROUTES PUBLIQUES :
 * - GET /location/geocode (géocoder une adresse)
 * - GET /location/reverse-geocode (géocodage inverse)
 * - GET /location/:contentId (détails localisation)
 *
 * ROUTES PROTÉGÉES :
 * - POST /location (créer)
 * - PATCH /location/:contentId (modifier)
 * - DELETE /location/:contentId (supprimer)
 */
@Module({
  imports: [
    PrismaModule, // ✅ Accès à la base de données
  ],
  controllers: [LocationController],
  providers: [LocationService, PrismaService],
  exports: [LocationService], // ✅ Exporté pour être utilisé dans d'autres modules
})
export class LocationModule {}
