// src/auth/strategies/jwt-admin.strategy.ts

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayloadData } from '../interfaces/jwt-payload.interface';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  private readonly logger = new Logger(JwtAdminStrategy.name);

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

  // src/auth/strategies/jwt-admin.strategy.ts

  // ...

  async validate(payload: JwtPayloadData) {
    this.logger.log(`Payload reçu: ${JSON.stringify(payload)}`);

    // Vérifier que c'est bien un token d'accès
    if (payload.type !== 'access') {
      this.logger.error(`Type de token invalide: ${payload.type}`);
      throw new UnauthorizedException('Type de token invalide');
    }

    // Récupérer l'administrateur depuis la base de données
    const admin = await this.prisma.administrator.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        isActive: true,
      },
    });

    // Vérifier que l'administrateur existe
    if (!admin) {
      this.logger.error(`Administrateur non trouvé: ${payload.sub}`);
      throw new UnauthorizedException('Administrateur non trouvé');
    }

    // Vérifier que le compte est actif
    if (admin.status === 'DELETED' || !admin.isActive) {
      this.logger.error(`Compte désactivé: ${admin.id}`);
      throw new UnauthorizedException('Compte désactivé');
    }

    this.logger.log(`Administrateur validé: ${admin.id}`);

    // Retourner l'administrateur avec la propriété sub ET type pour le décorateur @CurrentUser et le guard AdminGuard
    return {
      ...admin,
      sub: payload.sub,
      type: 'ADMINISTRATOR', // <--- AJOUTEZ CETTE LIGNE
    };
  }
}
