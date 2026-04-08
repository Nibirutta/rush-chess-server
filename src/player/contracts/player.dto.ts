import {
  IsString,
  IsNotEmpty,
  IsStrongPassword,
  Length,
  MaxLength,
} from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';

export class CreatePlayerDTO {
  @IsNotEmpty()
  @IsString()
  @Length(2, 20)
  nickname: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 20)
  username: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  @MaxLength(20)
  password: string;
}

export class LoginPlayerDTO extends OmitType(CreatePlayerDTO, ['nickname']) {}

export class UpdatePlayerDTO extends PartialType(CreatePlayerDTO) {}
