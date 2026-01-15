import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreatePlayerDTO } from './contracts/create-player.dto';
import { PlayerService } from './player.service';
import { SessionManagementInterceptor } from './interceptors/session-management.interceptor';
import { SessionGuard } from './guards/session.guard';
import { LoginPlayerDTO } from './contracts/login-player.dto';

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
  refreshSession(@Request() req) {
    return this.playerService.refreshSession(req.cookies.sessionToken);
  }
}
