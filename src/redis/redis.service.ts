/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, OnModuleDestroy, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants'; // Assure-toi que le chemin est correct

@Injectable()
export class RedisService implements OnModuleDestroy {
  // On demande à NestJS de nous donner le client REDIS_CLIENT déjà configuré
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  /**
   * Retourne l'instance du client Redis
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Ferme proprement la connexion lors de l'arrêt de l'application
   */
  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch (error) {
      // Évite de faire planter l'arrêt si la connexion était déjà perdue
    }
  }
}
