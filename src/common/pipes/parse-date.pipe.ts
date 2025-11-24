/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/common/pipes/parse-date.pipe.ts

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

/**
 * 📅 PARSE DATE PIPE
 *
 * Valide et transforme une chaîne en Date.
 *
 * UTILISATION :
 * @Get('filter')
 * filter(
 *   @Query('startDate', ParseDatePipe) startDate: Date,
 *   @Query('endDate', ParseDatePipe) endDate: Date,
 * ) {
 *   // startDate et endDate sont des objets Date valides
 * }
 */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  constructor(
    private readonly optional: boolean = false,
    private readonly fieldName?: string,
  ) {}

  transform(value: string, metadata: ArgumentMetadata): Date {
    const name = this.fieldName || metadata.data || 'Date';

    // Si optionnel et pas de valeur
    if (this.optional && !value) {
      return null as any;
    }

    // Si requis et pas de valeur
    if (!this.optional && !value) {
      throw new BadRequestException(`${name} est requis`);
    }

    // Parser la date
    const date = new Date(value);

    // Vérifier que c'est une date valide
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `${name} invalide. Format attendu : YYYY-MM-DD ou ISO 8601`,
      );
    }

    return date;
  }
}
