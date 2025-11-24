/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/pipes/parse-json.pipe.ts

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

/**
 * 📦 PARSE JSON PIPE
 *
 * Parse une chaîne JSON en objet.
 * Utile pour les query params complexes.
 *
 * UTILISATION :
 * @Get('filter')
 * filter(@Query('filters', ParseJsonPipe) filters: any) {
 *   // filters est un objet JavaScript
 * }
 *
 * Exemple de requête :
 * GET /users?filters={"role":"ADMIN","status":"ACTIVE"}
 */
@Injectable()
export class ParseJsonPipe implements PipeTransform {
  constructor(private readonly optional: boolean = false) {}

  transform(value: string, metadata: ArgumentMetadata) {
    const fieldName = metadata.data || 'JSON';

    // Si optionnel et pas de valeur
    if (this.optional && !value) {
      return null;
    }

    // Si requis et pas de valeur
    if (!this.optional && !value) {
      throw new BadRequestException(`${fieldName} est requis`);
    }

    // Si déjà un objet (body parsed par Express)
    if (typeof value === 'object') {
      return value;
    }

    // Parser le JSON
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new BadRequestException(
        `${fieldName} invalide. Le JSON n'est pas valide : ${error.message}`,
      );
    }
  }
}
