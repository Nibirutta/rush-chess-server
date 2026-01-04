import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { omit } from 'lodash';
import { CreatePlayerDTO } from './contracts/create-player.dto';
import { UpdatePlayerDTO } from './contracts/update-player.dto';
import * as bcrypt from 'bcrypt';
import { TokenService } from 'src/token/token.service';
import { LoginPlayerDTO } from './contracts/login-player.dto';

@Injectable()
export class PlayerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async login(loginPlayerDTO: LoginPlayerDTO) {
    const foundPlayer = await this.databaseService.player.findUnique({
      where: { username: loginPlayerDTO.username },
    });

    if (!foundPlayer) {
      throw new UnauthorizedException('Username or password is invalid');
    }

    const isValidPassword = await bcrypt.compare(
      loginPlayerDTO.password,
      foundPlayer.hashedPassword,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Username or password is invalid');
    }

    const { accessToken, sessionToken } =
      await this.tokenService.generateSessionTokens(
        foundPlayer.id,
        foundPlayer.nickname,
      );

    return {
      player: foundPlayer,
      accessToken,
      sessionToken,
    };
  }

  async createPlayer(createPlayerDTO: CreatePlayerDTO) {
    const hashedPassword = await bcrypt.hash(createPlayerDTO.password, 10);

    const playerData: Prisma.PlayerCreateInput = {
      ...omit(createPlayerDTO, ['password']),
      hashedPassword,
    };

    const createdPlayer = await this.databaseService.player.create({
      data: playerData,
    });

    const { accessToken, sessionToken } =
      await this.tokenService.generateSessionTokens(
        createdPlayer.id,
        createdPlayer.nickname,
      );

    return {
      player: createdPlayer,
      accessToken,
      sessionToken,
    };
  }

  async updatePlayer(id: string, updatePlayerDTO: UpdatePlayerDTO) {
    const playerData: Prisma.PlayerUpdateInput = {
      ...omit(updatePlayerDTO, ['password']),
      hashedPassword: updatePlayerDTO.password
        ? await bcrypt.hash(updatePlayerDTO.password, 10)
        : undefined,
    };

    const updatedPlayer = await this.databaseService.player.update({
      data: playerData,
      where: { id: id },
    });
    const { accessToken, sessionToken } =
      await this.tokenService.generateSessionTokens(
        updatedPlayer.id,
        updatedPlayer.nickname,
      );

    return {
      player: updatedPlayer,
      accessToken,
      sessionToken,
    };
  }

  async deletePlayer(id: string) {
    return this.databaseService.player.delete({ where: { id: id } });
  }
}
