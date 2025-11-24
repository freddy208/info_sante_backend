/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/filters/http-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 🎯 HTTP EXCEPTION FILTER
 *
 * Gère spécifiquement les HttpException de NestJS.
 * Plus spécifique que AllExceptionsFilter.
 *
 * Exemples d'HttpException :
 * - BadRequestException
 * - UnauthorizedException
 * - ForbiddenException
 * - NotFoundException
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extraire le message (peut être string ou objet)
    let message: string | string[];
    let error: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      error = exception.name;
    } else if (typeof exceptionResponse === 'object') {
      message = (exceptionResponse as any).message || exception.message;
      error = (exceptionResponse as any).error || exception.name;
    } else {
      message = exception.message;
      error = exception.name;
    }

    // Construire la réponse
    const errorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Logger selon la sévérité
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url}`, exception.stack);
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
