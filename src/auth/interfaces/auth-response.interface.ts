// src/auth/interfaces/auth-response.interface.ts

import { UserStatus } from '@prisma/client'; // ✅ Import de l'enum Prisma

/**
 * 📤 AUTH RESPONSE INTERFACE
 *
 * Structure des réponses d'authentification.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName?: string | null;
    phone?: string | null;
    avatar?: string | null;
    status: UserStatus;
    city: string | null;
    region: string | null;
  };
}
