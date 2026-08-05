import {
  COOKIE_NAMES,
  DomainCookieOptions,
  PlayerAlreadyLoggedInError,
  TokenService,
  TokenType,
} from '@app/common';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class LoggedInGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const response: Response = context.switchToHttp().getResponse<Response>();
    const cookies: Record<string, any> = request.cookies;
    const sessionToken: unknown = cookies[COOKIE_NAMES.SESSION_TOKEN];

    if (typeof sessionToken === 'string') {
      void this.tokenService.deleteToken(sessionToken);

      response.clearCookie(
        COOKIE_NAMES.SESSION_TOKEN,
        DomainCookieOptions(
          this.tokenService.getTokenMaxAge(TokenType.SESSION),
        ),
      );

      throw new PlayerAlreadyLoggedInError('Player already logged in');
    }

    return true;
  }
}
