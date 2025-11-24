/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/pipes/trim.pipe.ts

import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * ✂️ TRIM PIPE
 *
 * Supprime les espaces au début et à la fin des chaînes de caractères.
 * Utile pour les emails, noms d'utilisateur, etc.
 *
 * UTILISATION :
 * @Post()
 * create(@Body(TrimPipe) createUserDto: CreateUserDto) {
 *   // "  john@example.com  " → "john@example.com"
 * }
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }

    return this.trimObject(value);
  }

  /**
   * Trim récursif sur tous les strings d'un objet
   */
  private trimObject(obj: any): any {
    if (typeof obj === 'string') {
      return obj.trim();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.trimObject(item));
    }

    if (obj && typeof obj === 'object') {
      const trimmed: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          trimmed[key] = this.trimObject(obj[key]);
        }
      }
      return trimmed;
    }

    return obj;
  }
}
