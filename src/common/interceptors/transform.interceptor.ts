/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
 * 📦 INTERFACE DE RÉPONSE
 */
export interface Response {
  success: boolean;
  statusCode: number;
  message?: string;
  data: any;
  timestamp: string;
}

/**
 * ✨ TRANSFORM INTERCEPTOR (Version Stable)
 *
 * Formate les réponses et préserve les Cookies.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // ==========================================
        // CAS 1 : Réponse avec Cookies (Headers présents)
        // ==========================================
        // Cela arrive quand vous utilisez @Res({ passthrough: true }) + res.cookie()
        if (data && typeof data === 'object' && 'headers' in data) {
          const res = data as any;
          const statusCode = res.statusCode || 200; // On lit le statut direct de la réponse

          return {
            ...res, // <--- C'est ici qu'on garde le COOKIE
            success: true,
            statusCode: statusCode,
            data: res.body, // On met le corps (JSON) dans la propriété 'data'
            timestamp: new Date().toISOString(),
          };
        }

        // ==========================================
        // CAS 2 : Réponse Standard (JSON Brut)
        // ==========================================
        const http = context.switchToHttp();
        const statusCode = http.getResponse().statusCode || 200; // Fallback 200 si null

        return {
          success: true,
          statusCode: statusCode,
          data: data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
