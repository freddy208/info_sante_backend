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
    // Appeler le constructeur parent avec les options
    super({
      log: [
        { emit: 'event', level: 'query' }, // Logs des requêtes SQL
        { emit: 'event', level: 'error' }, // Logs des erreurs
        { emit: 'event', level: 'info' }, // Logs d'info
        { emit: 'event', level: 'warn' }, // Logs d'avertissement
      ],
      errorFormat: 'pretty', // Format d'erreur lisible
    });

    // Attacher les event listeners pour le logging
    this.attachLogListeners();
  }

  /**
   * 🔌 CONNEXION AU DÉMARRAGE
   *
   * Cette méthode est appelée automatiquement quand le module démarre.
   * Elle établit la connexion à la base de données.
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connexion à la base de données établie avec succès');

      // Afficher l'environnement actuel
      const nodeEnv = this.configService.get('NODE_ENV');
      this.logger.log(`🌍 Environnement : ${nodeEnv}`);
    } catch (error) {
      this.logger.error(
        '❌ Erreur lors de la connexion à la base de données',
        error,
      );
      throw error;
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
