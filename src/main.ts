/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // 1. Créer l'application NestJS
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Logs détaillés en dev
  });

  app.use(cookieParser()); // ✅ OBLIGATOIRE

  // 2. Récupérer le service de configuration
  const configService = app.get(ConfigService);

  // ==========================================
  // ✅ CORRECTION CORS : Dynamique et Sécurisée
  // ==========================================
  // On récupère les origines depuis le .env.
  // En local : "http://localhost:3000,http://localhost:3001"
  // Sur Render : "https://info-sante-237.vercel.app"
  const corsOrigins = configService.get<string>('CORS_ORIGINS');

  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',') : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // 4. Ajouter préfixe global aux routes API
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // 5. Activer validation automatique globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Garde seulement les champs du DTO
      forbidNonWhitelisted: true, // Rejette les champs non autorisés
      transform: true, // Active la transformation de types
      transformOptions: {
        enableImplicitConversion: true, // "123" → 123 automatiquement
      },
    }),
  );

  // =====================================
  // 📚 6. CONFIGURATION SWAGGER
  // =====================================
  const config = new DocumentBuilder()
    .setTitle('Info Sante Cameroun API')
    .setDescription(
      `API de la plateforme d'information sanitaire du Cameroun.
      
      Cette API permet de gérer :
      - 🔐 Authentification (JWT)
      - 👥 Utilisateurs
      - 🏥 Organisations (Hôpitaux, ONGs, Ministère)
      - 📢 Campagnes de santé
      - 📰 Articles et conseils santé
      - 🔔 Notifications (Push, Email, SMS)
      - 📁 Upload de fichiers
      
      **Base URL:** \`http://localhost:3001/${apiPrefix}\`
      `,
    )
    .setVersion('1.0')
    .setContact(
      'Info Sante Cameroun',
      'https://infosante.cm',
      'contact@infosante.cm',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')

    // Tags pour organiser les endpoints
    .addTag('Auth', 'Authentification et gestion des tokens')
    .addTag('Users', 'Gestion des utilisateurs')
    .addTag('Organizations', 'Gestion des organisations médicales')
    .addTag('Campaigns', 'Campagnes de santé et annonces')
    .addTag('Articles', 'Articles de santé')
    .addTag('Categories', 'Catégories et spécialités')
    .addTag('Notifications', 'Gestion des notifications')
    .addTag('Uploads', 'Upload de fichiers et images')

    // Schémas de sécurité (JWT)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Entrez votre token JWT',
        in: 'header',
      },
      'access-token', // Nom de référence
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT-refresh',
        description: 'Entrez votre refresh token',
        in: 'header',
      },
      'refresh-token', // Nom de référence
    )
    .build();

  // Créer le document Swagger
  const document = SwaggerModule.createDocument(app, config);

  // Monter Swagger sur /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Garde le token en mémoire
      docExpansion: 'none', // Tous les endpoints sont fermés par défaut
      filter: true, // Active la recherche
      showRequestDuration: true, // Affiche la durée des requêtes
    },
  });

  // 7. Démarrer le serveur
  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application démarrée sur http://localhost:${port}`);
  console.log(
    `📚 Routes API disponibles sur http://localhost:${port}/${apiPrefix}`,
  );
}

bootstrap();
