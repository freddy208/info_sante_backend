/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/interceptors/transform.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 📦 STRUCTURE DE RÉPONSE STANDARD
 */
export interface Response<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
}

/**
 * ✨ TRANSFORM INTERCEPTOR
 *
 * Formate toutes les réponses API dans un format standard.
 *
 * AVANT :
 * { id: 1, name: "John" }
 *
 * APRÈS :
 * {
 *   success: true,
 *   statusCode: 200,
 *   data: { id: 1, name: "John" },
 *   timestamp: "2025-11-24T11:30:00.000Z"
 * }
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const { statusCode } = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
