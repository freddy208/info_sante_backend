/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';
import { REDIS_CLIENT } from 'src/redis/redis.constants';
import Redis from 'ioredis';

import { Logger } from '@nestjs/common'; // Ajout de Logger ici
// ... autres imports

@Injectable()
export class JwtOrganizationStrategy extends PassportStrategy(
  Strategy,
  'jwt-organization',
) {
  // ✅ Déclaration du logger
  private readonly logger = new Logger(JwtOrganizationStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayloadData) {
    this.logger.debug(
      `Validation du payload pour upload: ${JSON.stringify(payload)}`,
    );
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Payload manquant');
    }
    if (!payload || !payload.sub || payload.type !== 'access') {
      throw new UnauthorizedException('Token invalide');
    }

    const orgId = payload.sub;
    const key = `org:${orgId}`;

    try {
      const cached = await this.redis.get(key).catch(() => null);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...parsed, sub: parsed.id };
      }

      // ✅ Ajout d'un timeout de sécurité pour Prisma (évite les sockets bloqués)
      const org = (await Promise.race([
        this.prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true, email: true, name: true, status: true },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout DB')), 5000),
        ),
      ])) as any;

      if (!org || (org.status !== 'ACTIVE' && org.status !== 'PENDING')) {
        throw new UnauthorizedException('Compte invalide');
      }

      await this.redis
        .set(key, JSON.stringify(org), 'EX', 300)
        .catch(() => null);

      return { ...org, sub: org.id };
    } catch (error) {
      // ✅ Maintenant this.logger fonctionnera
      this.logger.error(`Erreur d'authentification Strategy: ${error.message}`);
      throw new UnauthorizedException('Erreur de validation technique');
    }
  }
}
