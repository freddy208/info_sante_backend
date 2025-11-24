/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/filters/validation-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * ✅ VALIDATION EXCEPTION FILTER
 *
 * Formate les erreurs de validation (class-validator).
 *
 * AVANT (par défaut) :
 * {
 *   "message": [
 *     "email must be an email",
 *     "password must be longer than 8 characters"
 *   ]
 * }
 *
 * APRÈS (avec ce filter) :
 * {
 *   "success": false,
 *   "statusCode": 400,
 *   "error": "Validation Error",
 *   "message": "Erreurs de validation",
 *   "errors": {
 *     "email": ["L'email doit être valide"],
 *     "password": ["Le mot de passe doit contenir au moins 8 caractères"]
 *   }
 * }
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    // Vérifier si c'est une erreur de validation
    const isValidationError =
      Array.isArray(exceptionResponse.message) ||
      (typeof exceptionResponse.message === 'object' &&
        exceptionResponse.message !== null);

    let errorResponse;

    if (isValidationError && Array.isArray(exceptionResponse.message)) {
      // Formater les erreurs de validation
      const errors: Record<string, string[]> = {};

      exceptionResponse.message.forEach((error: string) => {
        // Extraire le champ et le message
        const match = error.match(/^(\w+)\s(.+)$/);
        if (match) {
          const [, field, message] = match;
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field].push(message);
        } else {
          if (!errors.general) {
            errors.general = [];
          }
          errors.general.push(error);
        }
      });

      errorResponse = {
        success: false,
        statusCode: status,
        error: 'Validation Error',
        message: 'Erreurs de validation détectées',
        errors,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
    } else {
      // BadRequestException normale
      errorResponse = {
        success: false,
        statusCode: status,
        error: 'Bad Request',
        message: exceptionResponse.message || 'Requête invalide',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
    }

    this.logger.warn(`${request.method} ${request.url} - Validation Error`);

    response.status(status).json(errorResponse);
  }
}
