// src/common/pipes/parse-uuid.pipe.ts

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as isUUID } from 'uuid';

/**
 * 🔑 PARSE UUID PIPE
 *
 * Valide qu'une chaîne est un UUID valide.
 *
 * UTILISATION :
 * @Get(':id')
 * findOne(@Param('id', ParseUuidPipe) id: string) {
 *   return this.service.findOne(id);
 * }
 *
 * AVANTAGE vs ParseUUIDPipe de NestJS :
 * Message d'erreur personnalisé et plus clair
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  constructor(private readonly fieldName: string = 'ID') {}

  transform(value: string): string {
    // Vérifier que la valeur existe
    if (!value) {
      throw new BadRequestException(
        `${this.fieldName} est requis et doit être un UUID valide`,
      );
    }

    // Valider que c'est un UUID
    if (!isUUID(value)) {
      throw new BadRequestException(
        `${this.fieldName} invalide. Format attendu : UUID (ex: 550e8400-e29b-41d4-a716-446655440000)`,
      );
    }

    return value;
  }
}
