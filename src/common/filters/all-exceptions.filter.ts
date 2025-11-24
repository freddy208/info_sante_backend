/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/filters/all-exceptions.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

/**
 * 🚨 ALL EXCEPTIONS FILTER
 *
 * Capture TOUTES les exceptions dans l'application.
 * C'est le "filet de sécurité" global.
 *
 * Gère :
 * - HttpException (erreurs NestJS)
 * - Erreurs inattendues (crash serveur)
 * - Erreurs Prisma
 * - Erreurs de validation
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Déterminer le status code
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extraire le message d'erreur
    let errorMessage: string | string[] = 'Une erreur est survenue';
    let errorName = 'Error';

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        errorMessage = (exceptionResponse as any).message;
      } else {
        errorMessage = exceptionResponse as string;
      }

      errorName = exception.name;
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorName = exception.name;
    }

    // Construire la réponse d'erreur
    const errorResponse = {
      success: false,
      statusCode: httpStatus,
      error: errorName,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: request.method,
    };

    // Logger l'erreur (différent selon l'environnement)
    if (httpStatus >= 500) {
      // Erreur serveur (500+) : log complet avec stack trace
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      // Erreur client (400+) : log simple
      this.logger.warn(
        `${request.method} ${request.url} - ${httpStatus} - ${JSON.stringify(errorMessage)}`,
      );
    }

    // Envoyer la réponse
    httpAdapter.reply(response, errorResponse, httpStatus);
  }
}
