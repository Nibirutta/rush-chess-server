import { Module } from '@nestjs/common';
import { ChessGateway } from './chess.gateway';
import { ChessService } from './chess.service';
import { ChessListener } from './chess.listener';

@Module({
  imports: [],
  controllers: [],
  providers: [ChessGateway, ChessService, ChessListener],
  exports: [],
})
export class ChessModule {}
