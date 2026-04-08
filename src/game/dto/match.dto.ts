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

export class SearchMatchDTO {
  @IsNotEmpty()
  @IsString()
  matchID: string;
}

export class RequestDrawDTO {
  @IsNotEmpty()
  @IsString()
  matchID: string;
}
