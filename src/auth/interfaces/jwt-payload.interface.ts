// src/auth/interfaces/jwt-payload.interface.ts

/**
 * 🎫 JWT PAYLOAD INTERFACE
 *
 * Structure des données stockées dans le token JWT.
 */
export interface JwtPayloadData {
  sub: string; // User ID (standard JWT "subject")
  email: string; // Email de l'utilisateur
  type: 'access' | 'refresh'; // Type de token
}
