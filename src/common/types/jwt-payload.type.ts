// src/common/types/jwt-payload.type.ts

/**
 * 🎫 STRUCTURE DU PAYLOAD JWT
 *
 * Ce type définit les informations stockées dans le token JWT.
 */
export interface JwtPayload {
  sub: string; // User ID (subject)
  email: string; // Email de l'utilisateur
  role: string; // Rôle (USER, ADMIN, HOSPITAL, etc.)
  organizationId?: string; // ID de l'organisation (pour hôpitaux)
  iat?: number; // Issued at (timestamp)
  exp?: number; // Expiration (timestamp)
}
