import { Module } from '@nestjs/common';
import { PlayerModule } from './player/player.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [PlayerModule, TokenModule],
})
export class AuthModule {}
