import { Module } from '@nestjs/common';
import { PlayerModule } from './player/player.module';
import { TokenModule } from './token/token.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PlayerModule, TokenModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
