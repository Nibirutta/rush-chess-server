import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MakeMoveDTO {
  @IsNotEmpty()
  @IsString()
  matchID: string;

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
