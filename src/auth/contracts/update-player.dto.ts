import { CreatePlayerDTO } from './create-player.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdatePlayerDTO extends PartialType(CreatePlayerDTO) {}
