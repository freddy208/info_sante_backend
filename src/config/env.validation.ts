/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/config/env.validation.ts

import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  validateSync,
  IsOptional,
} from 'class-validator';

/**
 * 🎯 ENUM pour les environnements possibles
 */
enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * 📋 CLASSE DE VALIDATION DES VARIABLES D'ENVIRONNEMENT
 *
 * Cette classe définit TOUTES les variables obligatoires et optionnelles.
 * Si une variable obligatoire manque, l'app ne démarre pas !
 */
class EnvironmentVariables {
  // =====================================
  // 🌍 CONFIGURATION GÉNÉRALE
  // =====================================

  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  API_PREFIX: string = 'api/v1';

  // =====================================
  // 🗄️ BASE DE DONNÉES
  // =====================================

  @IsString()
  DATABASE_URL: string;

  // =====================================
  // 🔐 JWT (AUTHENTIFICATION)
  // =====================================

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  // =====================================
  // ☁️ CLOUDINARY (UPLOAD)
  // =====================================

  @IsString()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  CLOUDINARY_API_KEY: string;

  @IsString()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  CLOUDINARY_UPLOAD_FOLDER: string = 'fichier_infos_sante_app_prod';

  // =====================================
  // 🗺️ GEOCODING (OpenCage)
  // =====================================

  @IsString()
  OPENCAGE_API_KEY: string;

  @IsString()
  GEOCODING_API_URL: string = 'https://api.opencagedata.com/geocode/v1';

  // =====================================
  // 📧 EMAIL (Resend)
  // =====================================

  @IsString()
  RESEND_API_KEY: string;

  @IsString()
  FROM_EMAIL: string = 'onboarding@resend.dev';

  @IsString()
  FROM_NAME: string = 'Infos Santé Cameroun';

  // =====================================
  // 🔔 FIREBASE (Notifications Push)
  // =====================================

  @IsString()
  FIREBASE_SERVICE_ACCOUNT_PATH: string = './firebase-service-account.json';

  // =====================================
  // 🚦 RATE LIMITING
  // =====================================

  @IsNumber()
  THROTTLE_TTL: number = 60;

  @IsNumber()
  THROTTLE_LIMIT: number = 10;

  // =====================================
  // 🌐 CORS & FRONTEND
  // =====================================

  @IsString()
  CORS_ORIGINS: string = 'http://localhost:3001';

  @IsString()
  FRONTEND_URL: string = 'http://localhost:3001';

  // =====================================
  // 📝 LOGGING
  // =====================================

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'debug';
}

/**
 * 🔍 FONCTION DE VALIDATION
 *
 * Cette fonction est appelée au démarrage de l'app.
 * Si une variable obligatoire manque, l'app crash avec un message clair !
 */
export function validate(config: Record<string, unknown>) {
  // Transformer l'objet simple en instance de classe
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true, // "3000" → 3000 automatiquement
  });

  // Valider toutes les propriétés
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false, // Ne pas ignorer les propriétés manquantes
  });

  // S'il y a des erreurs, arrêter l'app
  if (errors.length > 0) {
    console.error('❌ ERREUR DE CONFIGURATION :');
    console.error(
      "Les variables d'environnement suivantes sont invalides ou manquantes :\n",
    );

    errors.forEach((error) => {
      console.error(`🔴 ${error.property}:`);
      if (error.constraints) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        Object.values(error.constraints).forEach((message) => {
          console.error(`   - ${message}`);
        });
      }
    });

    throw new Error('Configuration invalide. Vérifiez votre fichier .env');
  }

  return validatedConfig;
}
