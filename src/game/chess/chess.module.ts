import { Module } from '@nestjs/common';
import { ChessGateway } from './chess.gateway';
import { ChessService } from './chess.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ChessGateway, ChessService],
  exports: [],
})
export class ChessModule {}
