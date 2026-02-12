import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Observable, map } from 'rxjs';
import { TokenType } from 'src/common/enums/token-type.enum';
import { TokenService } from 'src/token/token.service';

@Injectable()
export class LogoutInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request: Request = context.switchToHttp().getRequest();
    const response: Response = context.switchToHttp().getResponse();

    const sessionToken = request.cookies?.sessionToken as string;

    if (sessionToken) {
      await this.tokenService.deleteToken(sessionToken);
    }

    return next.handle().pipe(
      map((data: unknown) => {
        response.clearCookie('sessionToken', {
          secure: true,
          httpOnly: true,
          maxAge: this.tokenService.getTokenMaxAge(TokenType.SESSION),
          sameSite: 'none',
        });

        return data;
      }),
    );
  }
}
