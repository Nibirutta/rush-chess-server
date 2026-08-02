import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Observable, map } from 'rxjs';
import {
  TokenType,
  TokenService,
  DomainCookieOptions,
  COOKIE_NAMES,
} from '@app/common';

@Injectable()
export class LogoutInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const response: Response = context.switchToHttp().getResponse<Response>();
    const cookies: Record<string, any> = request.cookies;
    const sessionToken: unknown = cookies[COOKIE_NAMES.SESSION_TOKEN];

    if (typeof sessionToken === 'string') {
      await this.tokenService.deleteToken(sessionToken);
    }

    return next.handle().pipe(
      map((data: unknown) => {
        response.clearCookie(
          COOKIE_NAMES.SESSION_TOKEN,
          DomainCookieOptions(
            this.tokenService.getTokenMaxAge(TokenType.SESSION),
          ),
        );

        return data;
      }),
    );
  }
}
