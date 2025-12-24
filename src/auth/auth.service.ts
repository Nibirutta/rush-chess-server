import { Injectable } from '@nestjs/common';
import { PlayerService } from './player/player.service';
import { TokenService } from './token/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly playerService: PlayerService,
    private readonly tokenService: TokenService,
  ) {}
}
