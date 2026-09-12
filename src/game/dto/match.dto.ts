import { Square, SQUARES } from 'chess.js';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AvailableMovesDTO {
  @IsNotEmpty()
  @IsIn(SQUARES)
  piecePosition: Square;
}

export class MakeMoveDTO {
  @IsNotEmpty()
  @IsString()
  from: string;

  @IsNotEmpty()
  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  promotion: string;
}
