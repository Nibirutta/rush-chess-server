import { OmitType } from '@nestjs/mapped-types';
import { CreatePlayerDTO } from './create-player.dto';

export class LoginPlayerDTO extends OmitType(CreatePlayerDTO, ['nickname']) {}
