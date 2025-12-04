// src/uploads/interfaces/cloudinary-response.interface.ts

/**
 * ☁️ CLOUDINARY RESPONSE INTERFACE
 *
 * Structure de la réponse retournée par Cloudinary après un upload.
 */
export interface CloudinaryResponse {
  public_id: string; // ID unique Cloudinary (ex: "fichier_infos_sante_app_prod/user_avatars/abc123")
  secure_url: string; // URL HTTPS de l'image
  url: string; // URL HTTP de l'image
  format: string; // Format du fichier (jpg, png, pdf, etc.)
  resource_type: string; // Type de ressource (image, video, raw, auto)
  bytes: number; // Taille en bytes
  width?: number; // Largeur (images seulement)
  height?: number; // Hauteur (images seulement)
  created_at: string; // Date de création
  folder: string; // Dossier dans Cloudinary
  original_filename: string; // Nom original du fichier
}
