import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  Get,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ValidationPipe,
  UsePipes,
  UseFilters,
} from '@nestjs/common';
import { CreatePlayerDTO, LoginPlayerDTO } from './contracts/player.dto';
import { PlayerService } from './player.service';
import { SessionManagementInterceptor } from './interceptors/session-management.interceptor';
import { SessionGuard } from './guards/session.guard';
import { Request } from 'express';
import { LogoutInterceptor } from './interceptors/logout.interceptor';
import {
  COOKIE_NAMES,
  HttpDomainExceptionFilter,
  ValidationOptions,
} from '@app/common';
import { LoggedInGuard } from './guards/logged-in.guard';
import { LoggedPlayer } from './types/player.types';

@Controller('player')
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new HttpDomainExceptionFilter())
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @UseGuards(LoggedInGuard)
  @UseInterceptors(SessionManagementInterceptor)
  @Post('login')
  login(@Body() loginPlayerDTO: LoginPlayerDTO): Promise<LoggedPlayer> {
    const { username, password } = loginPlayerDTO;

    return this.playerService.login(username, password);
  }

  @UseInterceptors(SessionManagementInterceptor)
  @Post('register')
  registerPlayer(
    @Body() createPlayerDTO: CreatePlayerDTO,
  ): Promise<LoggedPlayer> {
    const { username, nickname, password } = createPlayerDTO;

    return this.playerService.createPlayer(username, nickname, password);
  }

  @UseGuards(SessionGuard)
  @UseInterceptors(SessionManagementInterceptor)
  @Get('refresh')
  refreshSession(@Req() req: Request): Promise<LoggedPlayer> | void {
    const sessionToken: unknown = req.cookies[COOKIE_NAMES.SESSION_TOKEN];

    if (typeof sessionToken === 'string')
      return this.playerService.refreshSession(sessionToken);
  }

  @UseInterceptors(LogoutInterceptor)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Get('logout')
  logout(): void {}
}
