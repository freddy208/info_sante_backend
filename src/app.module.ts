// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Configuration
import configuration from './config/configuration';
import { validate } from './config/env.validation';

// Modules
import { PrismaModule } from 'prisma/prisma.module';

// Controllers & Services
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Filters (Gestion des erreurs)
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  PrismaExceptionFilter,
  ValidationExceptionFilter,
} from './common/filters';

// Interceptors (Transformation des réponses)
import {
  TransformInterceptor,
  LoggingInterceptor,
} from './common/interceptors';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadsModule } from './uploads/uploads.module';
import { CategoriesModule } from './categories/categories.module';
import { LocationModule } from './location/location.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AdministratorsModule } from './administrators/administrators.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { AnnouncementRegistrationModule } from './announcement-registration/announcement-registration.module';
import { ArticleModule } from './article/article.module';
import { CommentModule } from './comment/comment.module';
import { ReactionModule } from './reaction/reaction.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { NotificationModule } from './notification/notification.module';
import { AdviceModule } from './advice/advice.module';
import { PublicModule } from './public/public.module';
import { MailService } from './mail/mail.service';
import { MailController } from './mail/mail.controller';
import { MailModule } from './mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';
import { UserPreferenceModule } from './user-preference/user-preference.module';

/**
 * 🏠 APP MODULE - MODULE RACINE
 // eslint-disable-next-line prettier/prettier
 * 
 * Ce module configure l'application complète avec :
 * - Configuration globale (env, validation)
 * - Base de données (Prisma)
 * - Rate limiting (Throttler)
 * - Gestion des erreurs (Exception Filters)
 * - Transformation des réponses (Interceptors)
 * - Protection contre les abus (Guards)
 */
@Module({
  imports: [
    RedisModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'public_list',
          limit: 60,
          ttl: 60,
        },
        {
          name: 'public_detail',
          limit: 100,
          ttl: 60,
        },
        {
          name: 'auth_medium',
          limit: 100,
          ttl: 60,
        },
        {
          name: 'auth_sensitive',
          limit: 5,
          ttl: 60,
        },
      ],
    }),
    // =====================================
    // 🔧 CONFIGURATION GLOBALE
    // =====================================
    ConfigModule.forRoot({
      isGlobal: true, // Accessible partout sans import
      load: [configuration], // Charge configuration.ts
      validate, // Valide les variables d'environnement
      envFilePath: '.env', // Chemin du fichier .env
      cache: true, // Cache les configs (performance)
    }),

    // =====================================
    // 🗄️ BASE DE DONNÉES
    // =====================================
    PrismaModule, // Module Prisma global

    // =====================================
    // 🚦 RATE LIMITING (Protection anti-spam)
    // =====================================
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Fenêtre de temps : 60 secondes
        limit: 10, // Maximum 10 requêtes par fenêtre
      },
    ]),
    AuthModule,
    UsersModule,
    UploadsModule,
    CategoriesModule,
    LocationModule,
    OrganizationsModule,
    AdministratorsModule,
    AnnouncementModule,
    AnnouncementRegistrationModule,
    ArticleModule,
    CommentModule,
    ReactionModule,
    BookmarkModule,
    NotificationModule,
    AdviceModule,
    PublicModule,
    MailModule,
    RedisModule,
    UserPreferenceModule,
  ],

  controllers: [AppController, MailController],

  providers: [
    AppService,

    // =====================================
    // 🚨 EXCEPTION FILTERS (Ordre d'exécution)
    // =====================================
    // Les filters s'exécutent du plus spécifique au plus général

    // 1. Erreurs de validation (BadRequestException)
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },

    // 2. Erreurs Prisma (base de données)
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },

    // 3. Erreurs HTTP standard
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // 4. Toutes les autres erreurs (filet de sécurité)
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // =====================================
    // 🎭 INTERCEPTORS
    // =====================================

    // 1. Logging (log avant/après chaque requête)
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // 2. Transform (formate toutes les réponses)
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },

    // =====================================
    // 🛡️ GUARDS (Protection)
    // =====================================

    // Rate Limiting (limite le nombre de requêtes)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    MailService,

    // Note : JwtAuthGuard et RolesGuard seront ajoutés
    // après avoir créé le module Auth
  ],
})
export class AppModule {}
