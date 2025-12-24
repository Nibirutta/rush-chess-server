import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma, Player } from 'src/generated/prisma/client';
import { omit } from 'lodash';
import { CreatePlayerDTO } from '../contracts/create-player.dto';
import { UpdatePlayerDTO } from '../contracts/update-player.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PlayerService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createPlayer(createPlayerDTO: CreatePlayerDTO): Promise<Player> {
    const hashedPassword = await bcrypt.hash(createPlayerDTO.password, 10);

    const playerData: Prisma.PlayerCreateInput = {
      ...omit(createPlayerDTO, ['password']),
      hashedPassword,
    };

    return this.databaseService.player.create({ data: playerData });
  }

  async updatePlayer(
    id: string,
    updatePlayerDTO: UpdatePlayerDTO,
  ): Promise<Player> {
    const playerData: Prisma.PlayerUpdateInput = {
      ...omit(updatePlayerDTO, ['password']),
      hashedPassword: updatePlayerDTO.password
        ? await bcrypt.hash(updatePlayerDTO.password, 10)
        : undefined,
    };

    return await this.databaseService.player.update({
      data: playerData,
      where: { id },
    });
  }

  async deletePlayer(id: string): Promise<Player> {
    return await this.databaseService.player.delete({ where: { id }});
  }
}
