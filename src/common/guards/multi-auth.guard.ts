/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// src/common/guards/multi-auth.guard.ts (ou fichier équivalent)

@Injectable()
export class MultiAuthGuard extends AuthGuard(['jwt-organization', 'jwt']) {
  // ^^^ IMPORTANT : On met 'jwt-organization' en premier.
  // Passport testera d'abord si c'est une organisation avant de tester si c'est un user.

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Veuillez vous connecter pour uploader un fichier',
        )
      );
    }
    return user;
  }
}
