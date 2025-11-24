/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 🎫 DECORATOR @CurrentUser
 *
 * Récupère l'utilisateur connecté depuis la requête.
 *
 * UTILISATION :
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * @Get('profile-id')
 * getProfileId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const { user } = request;

    // Si on demande une propriété spécifique (ex: @CurrentUser('id'))
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return user?.[data];
    }

    // Sinon, retourner l'utilisateur complet
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  },
);
