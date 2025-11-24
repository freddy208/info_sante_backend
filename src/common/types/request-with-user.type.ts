// src/common/types/request-with-user.type.ts

import { Request } from 'express';

/**
 * 🌐 TYPE REQUEST AVEC UTILISATEUR
 *
 * Étend le type Request d'Express pour inclure l'utilisateur.
 */
export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}
