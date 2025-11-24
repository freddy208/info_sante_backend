// src/auth/strategies/jwt-refresh.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 🔄 JWT REFRESH STRATEGY
 *
 * Valide le refresh token pour générer un nouveau access token.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const refreshSecret = configService.get<string>('jwt.refreshSecret');
    if (!refreshSecret) {
      throw new Error('JWT refresh secret is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
    });
  }

  async validate(payload: JwtPayloadData) {
    // Vérifier que c'est bien un refresh token
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Type de token invalide');
    }

    // Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
      },
    });

    // Vérifier que l'utilisateur existe et est actif
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Compte inactif ou suspendu');
    }

    return user;
  }
}
