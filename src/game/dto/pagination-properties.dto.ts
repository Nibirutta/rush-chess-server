import { IsNumber, IsOptional } from "class-validator";

export class PaginationPropertiesDTO {
  @IsOptional()
  @IsNumber()
  amount: number = 50;

  @IsOptional()
  @IsNumber()
  skip: number = 0;
}