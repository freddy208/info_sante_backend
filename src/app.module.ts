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
  ],

  controllers: [AppController],

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

    // Note : JwtAuthGuard et RolesGuard seront ajoutés
    // après avoir créé le module Auth
  ],
})
export class AppModule {}
