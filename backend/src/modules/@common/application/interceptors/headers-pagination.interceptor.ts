import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Response } from 'express';

@Injectable()
export class HeadersPaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'total' in data && 'items' in data) {
          const response = context.switchToHttp().getResponse<Response>();
          response.setHeader('X-Total-Count', (data as any).total);
          return (data as any).items;
        }
        return data;
      }),
    );
  }
}
