import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { TokenService } from 'src/token/token.service';
import { TokenType } from 'src/common/enums/token-type.enum';

@Injectable()
export class SessionManagementInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const response: Response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'sessionToken' in data) {
          response.clearCookie('sessionToken', {
            secure: true,
            httpOnly: true,
            maxAge: this.tokenService.getTokenMaxAge(TokenType.SESSION),
            sameSite: 'none',
          });

          response.cookie('sessionToken', data.sessionToken, {
            secure: true,
            httpOnly: true,
            maxAge: this.tokenService.getTokenMaxAge(TokenType.SESSION),
            sameSite: 'none',
          });

          const payload = data;
          delete payload.sessionToken;

          return payload;
        }

        return data;
      }),
    );
  }
}
