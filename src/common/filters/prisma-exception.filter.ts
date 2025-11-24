/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/filters/prisma-exception.filter.ts

import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * 🗄️ PRISMA EXCEPTION FILTER
 // eslint-disable-next-line prettier/prettier
 * 
 * Gère les erreurs spécifiques à Prisma ORM.
 * 
 * Erreurs courantes :
 * - P2002 : Contrainte unique violée (email déjà existant)
 * - P2025 : Enregistrement non trouvé
 * - P2003 : Contrainte de clé étrangère violée
 * - P2001 : Enregistrement requis non trouvé
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Une erreur de base de données est survenue';
    let error = 'Database Error';

    // Gérer les erreurs Prisma connues
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          // Contrainte unique violée
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          const target = (exception.meta?.target as string[]) || [];
          message = `Un enregistrement avec ce ${target.join(', ')} existe déjà`;
          break;
        }

        case 'P2025':
          // Enregistrement non trouvé
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'Enregistrement non trouvé';
          break;

        case 'P2003':
          // Contrainte de clé étrangère violée
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'Référence invalide vers un autre enregistrement';
          break;

        case 'P2001':
          // Enregistrement requis non trouvé
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = 'Enregistrement requis non trouvé';
          break;

        case 'P2014':
          // Relation violée
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message =
            'La modification viole une relation dans la base de données';
          break;

        default:
          this.logger.error(`Code d'erreur Prisma non géré: ${exception.code}`);
          message = `Erreur de base de données (${exception.code})`;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = 'Erreur de validation des données';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Service Unavailable';
      message = 'Impossible de se connecter à la base de données';
    }

    // Logger l'erreur
    this.logger.error(
      `${request.method} ${request.url} - Prisma Error: ${exception.code || 'UNKNOWN'}`,
      exception.stack,
    );

    // Réponse formatée
    const errorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    response.status(status).json(errorResponse);
  }
}
