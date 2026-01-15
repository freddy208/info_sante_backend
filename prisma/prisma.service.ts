/* eslint-disable prettier/prettier */
 
 
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/prisma/prisma.service.ts

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * 🗄️ PRISMA SERVICE
 *
 * Ce service gère la connexion à la base de données PostgreSQL via Prisma.
 * Il implémente les interfaces NestJS pour gérer le cycle de vie :
 * - OnModuleInit : Se connecte au démarrage
 * - OnModuleDestroy : Se déconnecte proprement à l'arrêt
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
  // 1. On prépare le pool de connexion PostgreSQL
    const pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
    });

    // 2. On crée l'adapter pour Prisma 7
    const adapter = new PrismaPg(pool);

    // 3. On appelle le constructeur parent en lui PASSANT l'adapter
    super({
      adapter: adapter, // C'EST CETTE LIGNE QUI MANQUAIT
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    this.attachLogListeners();
  }

  /**
   * 🔌 CONNEXION AU DÉMARRAGE
   *
   * Cette méthode est appelée automatiquement quand le module démarre.
   * Elle établit la connexion à la base de données.
   */
  async onModuleInit() {
    // Nombre de tentatives de reconnexion
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log(
          '✅ Connexion à la base de données établie avec succès',
        );
        break;
      } catch (error) {
        retries--;
        this.logger.error(
          `❌ Erreur de connexion (Tentatives restantes: ${retries})`,
          error.message,
        );
        if (retries === 0) {
          this.logger.error(
            "Séquence d'initialisation échouée après 5 tentatives.",
          );
          // On ne throw plus forcément ici pour laisser l'app démarrer quand même
        }
        // Attendre 2 secondes avant de réessayer
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
  }

  /**
   * 🔌 DÉCONNEXION À L'ARRÊT
   *
   * Cette méthode est appelée automatiquement quand l'application s'arrête.
   * Elle ferme proprement la connexion à la base de données.
   */
  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('✅ Déconnexion de la base de données réussie');
    } catch (error) {
      this.logger.error(
        '❌ Erreur lors de la déconnexion de la base de données',
        error,
      );
    }
  }

  /**
   * 📊 ATTACHER LES LISTENERS POUR LE LOGGING
   *
   * Ces listeners capturent les événements Prisma pour les logger proprement.
   */
  /**
   * 📊 ATTACHER LES LISTENERS POUR LE LOGGING
   *
   * Ces listeners capturent les événements Prisma pour les logger proprement.
   */
  private attachLogListeners() {
    // Logger les requêtes SQL (utile en développement)
    this.$on('query' as never, (e: any) => {
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.debug(`🔍 Query: ${e.query}`);
        this.logger.debug(`📊 Params: ${e.params}`);
        this.logger.debug(`⏱️  Duration: ${e.duration}ms`);
      }
    });

    // Logger les erreurs
    this.$on('error' as never, (e: any) => {
      this.logger.error(`❌ Prisma Error: ${e.message}`);
    });

    // Logger les infos
    this.$on('info' as never, (e: any) => {
      this.logger.log(`ℹ️  Info: ${e.message}`);
    });

    // Logger les avertissements
    this.$on('warn' as never, (e: any) => {
      this.logger.warn(`⚠️  Warning: ${e.message}`);
    });
  }

  /**
   * 🧹 NETTOYER LA BASE DE DONNÉES
   *
   * Méthode utile pour les tests : supprime toutes les données.
   * ⚠️ À utiliser UNIQUEMENT en environnement de test !
   */
  async cleanDatabase() {
    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv === 'production') {
      throw new Error(
        '❌ Impossible de nettoyer la base de données en production !',
      );
    }

    this.logger.warn('🧹 Nettoyage de la base de données...');

    // Liste de toutes vos tables (dans l'ordre inverse des dépendances)
    const tables = [
      'CampaignRegistration',
      'SMSNotification',
      'Comment',
      'Review',
      'Notification',
      'Article',
      'HealthAdvice',
      'Announcement',
      'Organization',
      'User',
      'Category',
      'Specialty',
      // Ajoutez toutes vos autres tables ici
    ];

    for (const table of tables) {
      try {
        await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        this.logger.log(`✅ Table ${table} nettoyée`);
      } catch (error) {
        this.logger.warn(
          `⚠️  Impossible de nettoyer la table ${table}: ${error.message}`,
        );
      }
    }

    this.logger.log('✅ Base de données nettoyée avec succès');
  }

  /**
   * 🔄 RÉINITIALISER LES SÉQUENCES
   *
   * Utile après cleanDatabase() pour réinitialiser les IDs auto-incrémentés
   */
  async resetSequences() {
    const nodeEnv = this.configService.get('NODE_ENV');

    if (nodeEnv === 'production') {
      throw new Error(
        '❌ Impossible de réinitialiser les séquences en production !',
      );
    }

    this.logger.warn('🔄 Réinitialisation des séquences...');

    // Cette commande réinitialise tous les compteurs de séquences
    await this.$executeRaw`
      SELECT setval(pg_get_serial_sequence('"User"', 'id'), 1, false);
    `;

    this.logger.log('✅ Séquences réinitialisées');
  }
}
