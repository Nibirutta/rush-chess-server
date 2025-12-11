import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [UserModule, TokenModule]
})
export class AuthModule {}
