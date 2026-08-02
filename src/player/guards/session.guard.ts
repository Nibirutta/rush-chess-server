import { COOKIE_NAMES } from '@app/common';
import {
  CanActivate,
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest<Request>();
    const cookies: Record<string, any> = request.cookies;
    const sessionToken: unknown = cookies[COOKIE_NAMES.SESSION_TOKEN];

    if (!sessionToken) {
      throw new UnauthorizedException('Session Token Missing');
    }

    return true;
  }
}
