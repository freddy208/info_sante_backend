/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/pipes/sanitize.pipe.ts

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * 🧹 SANITIZE PIPE
 *
 * Nettoie les données pour éviter les injections XSS.
 * Supprime les balises HTML et scripts.
 *
 * UTILISATION :
 * @Post()
 * create(@Body(SanitizePipe) createDto: CreateDto) {
 *   // Les chaînes sont nettoyées des balises HTML
 * }
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }

    return this.sanitizeObject(value);
  }

  /**
   * Sanitize récursif sur tous les strings d'un objet
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Nettoie une chaîne de caractères
   */
  private sanitizeString(str: string): string {
    // Supprimer les balises HTML
    let cleaned = str.replace(/<[^>]*>/g, '');

    // Encoder les caractères spéciaux
    cleaned = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return cleaned;
  }
}
