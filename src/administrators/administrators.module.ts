// src/administrators/administrators.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'prisma/prisma.module';
import { AdministratorsController } from './administrators.controller';
import { AdministratorsService } from './administrators.service';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 👨‍💼 ADMINISTRATORS MODULE
 *
 * Module de gestion des administrateurs de la plateforme
 *
 * FONCTIONNALITÉS :
 * - Authentification admin (register, login, refresh)
 * - Gestion du profil admin
 * - Gestion des organizations (valider, suspendre, supprimer)
 * - Gestion des users (suspendre, supprimer)
 * - Gestion des autres admins (SUPER_ADMIN)
 * - Statistiques et dashboard
 *
 * DÉPENDANCES :
 * - PrismaModule : Accès à la base de données
 * - JwtModule : Authentification et tokens
 * - ConfigModule : Configuration (secrets JWT, etc.)
 *
 * ROUTES :
 * - POST /administrators/login (connexion)
 * - POST /administrators/refresh (rafraîchir tokens)
 * - GET /administrators/me (profil)
 * - PATCH /administrators/me (modifier profil)
 * - POST /administrators (créer admin - SUPER_ADMIN)
 * - GET /administrators (liste admins)
 * - GET /administrators/organizations (liste organizations)
 * - PATCH /administrators/organizations/:id/verify (valider organization)
 * - GET /administrators/users (liste users)
 * - GET /administrators/dashboard (statistiques)
 *
 * GUARDS UTILISÉS :
 * - JwtAuthGuard : Vérifie le JWT access token
 * - AdminGuard : Vérifie que c'est un administrateur
 * - AdminPermissionGuard : Vérifie les permissions spécifiques
 *
 * PERMISSIONS :
 * - SUPER_ADMIN : Tous les droits
 * - VALIDATOR : Valider les organizations
 * - MODERATOR : Modérer le contenu
 * - SUPPORT : Support utilisateurs
 * - ANALYST : Consulter les statistiques
 */
@Module({
  imports: [
    PrismaModule, // ✅ Accès à la base de données
    ConfigModule, // ✅ Configuration

    // ✅ JWT pour l'authentification des admins
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          expiresIn: configService.get<string>('jwt.expiresIn') as any,
        },
      }),
    }),
  ],
  controllers: [AdministratorsController],
  providers: [AdministratorsService, PrismaService],
  exports: [AdministratorsService], // ✅ Exporté pour utilisation dans d'autres modules
})
export class AdministratorsModule {}
