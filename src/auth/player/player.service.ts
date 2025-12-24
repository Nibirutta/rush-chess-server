import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { omit } from 'lodash';
import { CreatePlayerDTO } from '../contracts/create-player.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PlayerService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createPlayer(createPlayerDTO: CreatePlayerDTO) {
    const hashedPassword = await bcrypt.hash(createPlayerDTO.password, 10);

    const playerData: Prisma.PlayerCreateInput = {
      ...omit(createPlayerDTO, ['password']),
      hashedPassword,
    };

    return this.databaseService.player.create({ data: playerData });
  }
}
