import {
  IsNotEmpty,
  MaxLength,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

export class PaginationPropertiesDTO {
  @IsOptional()
  @IsNumber()
  amount: number = 50;

  @IsOptional()
  @IsNumber()
  skip: number = 0;
}

export class SendMessageDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  content: string;
}
