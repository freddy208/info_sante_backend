/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/common/guards/jwt-admin-auth.guard.ts

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAdminAuthGuard extends AuthGuard('jwt-admin') {
  private readonly logger = new Logger(JwtAdminAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si publique, autoriser l'accès
    if (isPublic) {
      return true;
    }

    // Sinon, vérifier le JWT
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(`Erreur de stratégie: ${err ? err.message : 'N/A'}`);
    this.logger.log(
      `Info de stratégie: ${info ? info.name + ' - ' + info.message : 'N/A'}`,
    );
    this.logger.log(`Utilisateur reçu: ${JSON.stringify(user)}`);

    // Si erreur ou pas d'utilisateur, rejeter
    if (err || !user) {
      // Si l'erreur vient de passport, elle peut être plus informative
      if (err) {
        this.logger.error(`Erreur Passport: ${err.message}`, err.stack);
        throw new UnauthorizedException(err.message);
      }
      // Si `info` est disponible, il peut donner des détails sur l'échec
      if (info) {
        this.logger.error(`Info Passport: ${info.name} - ${info.message}`);
        if (info.name === 'JsonWebTokenError') {
          throw new UnauthorizedException(
            'Token invalide (mauvaise signature ou malformé)',
          );
        }
        if (info.name === 'TokenExpiredError') {
          throw new UnauthorizedException('Token expiré');
        }
        if (info.name === 'NotBeforeError') {
          throw new UnauthorizedException('Token pas encore valide');
        }
        throw new UnauthorizedException(
          `Erreur d'authentification: ${info.message}`,
        );
      }
      this.logger.error(
        'Erreur inconnue: utilisateur non trouvé par la stratégie',
      );
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    return user;
  }
}
