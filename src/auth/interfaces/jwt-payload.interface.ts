export interface JwtPayloadData {
  sub: string; // User ID
  email: string; // Email de l'utilisateur
  type: 'access' | 'refresh'; // Type de token
  roles?: string[]; // RBAC côté middleware
  deviceId?: string; // Limiter token par appareil
  iat?: number;
  exp?: number;
  jti?: string;
}
