// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';

/**
 * 🔑 JWT STRATEGY
 *
 * Valide le JWT access token et récupère l'utilisateur.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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

  /**
   * Méthode appelée automatiquement après vérification du token
   */
  async validate(payload: JwtPayloadData) {
    // Vérifier que c'est bien un access token
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Type de token invalide');
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true, // ✅ ENUM UserStatus
      },
    });

    // Vérifier que l'utilisateur existe
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    // Vérifier que le compte est actif
    if (user.status !== 'ACTIVE') {
      // ✅ Comparaison correcte avec l'enum
      throw new UnauthorizedException('Compte désactivé');
    }

    // Retourner l'utilisateur (sera attaché à request.user)
    return user;
  }
}
