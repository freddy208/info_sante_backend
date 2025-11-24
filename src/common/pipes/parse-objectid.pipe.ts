/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/common/pipes/parse-objectid.pipe.ts

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';

/**
 * 🎯 PARSE OBJECT ID PIPE
 *
 * Version plus flexible du ParseUuidPipe.
 * Détermine automatiquement le nom du champ depuis les métadonnées.
 *
 * UTILISATION :
 * @Get(':userId')
 * findUser(@Param('userId', ParseObjectIdPipe) userId: string) {
 *   // Erreur automatique : "userId invalide..."
 * }
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    const fieldName = metadata.data || 'ID';

    if (!value) {
      throw new BadRequestException(`${fieldName} est requis`);
    }

    if (!isUUID(value)) {
      throw new BadRequestException(`${fieldName} doit être un UUID valide`);
    }

    return value;
  }
}
