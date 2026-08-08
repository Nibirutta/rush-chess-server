import { Injectable } from '@nestjs/common';
import { Prisma, Player } from 'src/generated/prisma/client';
import { omit } from 'lodash';
import * as bcrypt from 'bcrypt';
import {
  InvalidCredentialsError,
  PlayerNotFoundError,
  TokenService,
  TokenType,
  DatabaseService,
  COOKIE_NAMES,
  PlayerConflictError,
} from '@app/common';
import { LoggedPlayer } from './types/player.types';

@Injectable()
export class PlayerService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async login(username: string, password: string): Promise<LoggedPlayer> {
    const foundPlayer = await this.databaseService.player.findUnique({
      where: { username: username },
    });

    if (!foundPlayer)
      throw new InvalidCredentialsError('Username or password is invalid');

    const isPasswordCorrect = await bcrypt.compare(
      password,
      foundPlayer.hashedPassword,
    );

    if (!isPasswordCorrect)
      throw new InvalidCredentialsError('Username or password is invalid');

    const accessToken = await this.tokenService.generateToken(
      {
        playerID: foundPlayer.id,
        playerNickname: foundPlayer.nickname,
      },
      TokenType.ACCESS,
    );

    const sessionToken = await this.tokenService.generateToken(
      {
        playerID: foundPlayer.id,
      },
      TokenType.SESSION,
    );

    return {
      profile: omit(foundPlayer, ['hashedPassword']),
      [COOKIE_NAMES.ACCESS_TOKEN]: accessToken,
      [COOKIE_NAMES.SESSION_TOKEN]: sessionToken,
    };
  }

  async refreshSession(cookie: string): Promise<LoggedPlayer> {
    const decodedToken = await this.tokenService.validateToken(
      cookie,
      TokenType.SESSION,
    );

    const foundPlayer = await this.databaseService.player.findUnique({
      where: { id: decodedToken.playerID },
    });

    if (!foundPlayer)
      throw new PlayerNotFoundError('Player does not exist anymore');

    this.tokenService.deleteToken(cookie).catch((error) => {
      console.log(error);
    });

    const accessToken = await this.tokenService.generateToken(
      {
        playerID: foundPlayer.id,
        playerNickname: foundPlayer.nickname,
      },
      TokenType.ACCESS,
    );

    const sessionToken = await this.tokenService.generateToken(
      {
        playerID: foundPlayer.id,
      },
      TokenType.SESSION,
    );

    return {
      profile: omit(foundPlayer, ['hashedPassword']),
      [COOKIE_NAMES.ACCESS_TOKEN]: accessToken,
      [COOKIE_NAMES.SESSION_TOKEN]: sessionToken,
    };
  }

  async createPlayer(
    username: string,
    nickname: string,
    password: string,
  ): Promise<LoggedPlayer> {
    const hasDuplicateCredentials = await this.databaseService.player.findMany({
      where: { OR: [{ nickname: nickname }, { username: username }] },
    });

    if (hasDuplicateCredentials)
      throw new PlayerConflictError('Username or nickname unavailable');

    const hashedPassword = await bcrypt.hash(password, 10);

    const playerCreateInput: Prisma.PlayerCreateInput = {
      username,
      nickname,
      hashedPassword,
    };

    const createdPlayer = await this.databaseService.player.create({
      data: playerCreateInput,
    });

    const accessToken = await this.tokenService.generateToken(
      {
        playerID: createdPlayer.id,
        playerNickname: createdPlayer.nickname,
      },
      TokenType.ACCESS,
    );

    const sessionToken = await this.tokenService.generateToken(
      {
        playerID: createdPlayer.id,
      },
      TokenType.SESSION,
    );

    return {
      profile: omit(createdPlayer, ['hashedPassword']),
      [COOKIE_NAMES.ACCESS_TOKEN]: accessToken,
      [COOKIE_NAMES.SESSION_TOKEN]: sessionToken,
    };
  }

  async updatePlayer(
    id: string,
    nickname?: string,
    password?: string,
  ): Promise<LoggedPlayer> {
    const hasDuplicatedNickname = await this.databaseService.player.findUnique({
      where: { nickname: nickname },
    });

    if (hasDuplicatedNickname)
      throw new PlayerConflictError('Nickname unavailable');

    const playerUpdateInput: Prisma.PlayerUpdateInput = {
      nickname,
      hashedPassword: password ? await bcrypt.hash(password, 10) : undefined,
    };

    const updatedPlayer = await this.databaseService.player.update({
      data: playerUpdateInput,
      where: { id: id },
    });

    const accessToken = await this.tokenService.generateToken(
      {
        playerID: updatedPlayer.id,
        playerNickname: updatedPlayer.nickname,
      },
      TokenType.ACCESS,
    );

    const sessionToken = await this.tokenService.generateToken(
      {
        playerID: updatedPlayer.id,
      },
      TokenType.SESSION,
    );

    return {
      profile: omit(updatedPlayer, ['hashedPassword']),
      [COOKIE_NAMES.ACCESS_TOKEN]: accessToken,
      [COOKIE_NAMES.SESSION_TOKEN]: sessionToken,
    };
  }

  async deletePlayer(id: string): Promise<Player> {
    return this.databaseService.player.delete({ where: { id: id } });
  }
}
