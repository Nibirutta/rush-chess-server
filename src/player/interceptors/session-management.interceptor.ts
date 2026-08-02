import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import {
  COOKIE_NAMES,
  DomainCookieOptions,
  TokenService,
  TokenType,
} from '@app/common';

type DataType = {
  [COOKIE_NAMES.SESSION_TOKEN]: string;
} & Record<string, unknown>;

@Injectable()
export class SessionManagementInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const response: Response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: DataType | undefined) => {
        if (data) {
          const { [COOKIE_NAMES.SESSION_TOKEN]: removedToken, ...rest } = data;

          response.clearCookie(
            COOKIE_NAMES.SESSION_TOKEN,
            DomainCookieOptions(
              this.tokenService.getTokenMaxAge(TokenType.SESSION),
            ),
          );

          response.cookie(
            COOKIE_NAMES.SESSION_TOKEN,
            removedToken,
            DomainCookieOptions(
              this.tokenService.getTokenMaxAge(TokenType.SESSION),
            ),
          );

          return rest;
        }

        return data;
      }),
    );
  }
}
