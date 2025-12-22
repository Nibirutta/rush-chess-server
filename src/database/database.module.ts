import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [],
})
export class DatabaseModule {}
