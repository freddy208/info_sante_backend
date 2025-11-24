/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/interceptors/logging.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * 📝 LOGGING INTERCEPTOR
 *
 * Logue toutes les requêtes et leur temps d'exécution.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    const userEmail = user?.email || 'Anonymous';
    const now = Date.now();

    this.logger.log(`➡️  ${method} ${url} | User: ${userEmail}`);

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `✅ ${method} ${url} | ${responseTime}ms | User: ${userEmail}`,
        );
      }),
    );
  }
}
