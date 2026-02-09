import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreatePlayerDTO } from './contracts/create-player.dto';
import { PlayerService } from './player.service';
import { SessionManagementInterceptor } from './interceptors/session-management.interceptor';
import { SessionGuard } from './guards/session.guard';
import { LoginPlayerDTO } from './contracts/login-player.dto';
import { Request } from 'express';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @UseInterceptors(SessionManagementInterceptor)
  @Post('login')
  login(@Body() loginPlayerDTO: LoginPlayerDTO) {
    return this.playerService.login(loginPlayerDTO);
  }

  @UseInterceptors(SessionManagementInterceptor)
  @Post('register')
  registerPlayer(@Body() createPlayerDTO: CreatePlayerDTO) {
    return this.playerService.createPlayer(createPlayerDTO);
  }

  @UseGuards(SessionGuard)
  @UseInterceptors(SessionManagementInterceptor)
  @Get('refresh')
  refreshSession(@Req() req: Request) {
    const sessionToken = req.cookies.sessionToken as string;

    return this.playerService.refreshSession(sessionToken);
  }
}
