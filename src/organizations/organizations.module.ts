/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
// src/organizations/organizations.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { LocationModule } from '../location/location.module';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaModule } from 'prisma/prisma.module';

/**
 * 🏥 ORGANIZATIONS MODULE
 *
 * Module central pour la gestion des organisations (hôpitaux, ONGs, cliniques, etc.)
 *
 * FONCTIONNALITÉS :
 * - Inscription et authentification JWT
 * - Gestion du profil complet
 * - Gestion des membres de l'équipe
 * - Intégration avec la géolocalisation
 * - Validation par administrateur
 * - Recherche et filtrage avancé
 *
 * DÉPENDANCES :
 * - PrismaModule : Accès à la base de données
 * - LocationModule : Géolocalisation (OpenCage)
 * - JwtModule : Authentification et tokens
 *
 * ROUTES PUBLIQUES :
 * - POST /organizations/register (inscription)
 * - POST /organizations/login (connexion)
 * - POST /organizations/refresh (rafraîchir token)
 * - GET /organizations (liste)
 * - GET /organizations/:id (détails)
 *
 * ROUTES PROTÉGÉES :
 * - GET /organizations/me (profil)
 * - PATCH /organizations/me (modifier profil)
 * - PATCH /organizations/me/password (changer mot de passe)
 * - POST /organizations/me/members (ajouter membre)
 * - GET /organizations/me/members (liste membres)
 * - PATCH /organizations/me/members/:id (modifier membre)
 * - DELETE /organizations/me/members/:id (supprimer membre)
 */
@Module({
  imports: [
    PrismaModule, // ✅ Accès à la base de données
    LocationModule, // ✅ Géolocalisation (créer/mettre à jour localisation)

    // ✅ JWT pour l'authentification des organisations
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn') as any,
        },
      }),
    }),
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService],
  exports: [OrganizationsService], // ✅ Exporté pour utilisation dans d'autres modules
})
export class OrganizationsModule {}
