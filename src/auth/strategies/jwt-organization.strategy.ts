// src/auth/strategies/jwt-organization.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class JwtOrganizationStrategy extends PassportStrategy(
  Strategy,
  'jwt-organization',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayloadData) {
    // Vérifier que c'est bien un token d'accès
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Type de token invalide');
    }

    // Récupérer l'organisation depuis la base de données
    const organization = await this.prisma.organization.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        status: true,
        isVerified: true,
      },
    });

    // Vérifier que l'organisation existe
    if (!organization) {
      throw new UnauthorizedException('Organisation non trouvée');
    }

    // Vérifier que le compte est actif
    if (organization.status !== 'ACTIVE') {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Retourner l'organisation avec la propriété sub pour le décorateur @CurrentUser
    return {
      ...organization,
      sub: payload.sub, // Ajouter explicitement la propriété sub
    };
  }
}
