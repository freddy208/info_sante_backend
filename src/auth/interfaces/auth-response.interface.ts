import { UserStatus } from '@prisma/client';

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
    roles?: string[]; // pour RBAC
    permissions?: string[]; // pour RBAC fin
    lastLogin?: Date; // monitoring / session tracking
    deviceId?: string; // multi-device tracking
    sessionId?: string; // identifiant unique de session
  };
}
