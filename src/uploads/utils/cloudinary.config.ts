// src/uploads/utils/cloudinary.config.ts

import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

/**
 * ☁️ CLOUDINARY CONFIGURATION
 *
 * Configure le SDK Cloudinary avec les credentials depuis .env
 *
 * SÉCURITÉ :
 * - Les credentials ne sont JAMAIS exposés côté client
 * - Utilisation de signed uploads pour la sécurité
 */
export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: (configService: ConfigService) => {
    // Configuration du SDK Cloudinary
    return cloudinary.config({
      cloud_name: configService.get<string>('cloudinary.cloudName'),
      api_key: configService.get<string>('cloudinary.apiKey'),
      api_secret: configService.get<string>('cloudinary.apiSecret'),
      secure: true, // ✅ Toujours utiliser HTTPS
    });
  },
  inject: [ConfigService],
};
