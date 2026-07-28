import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';
import { ChessConfigService } from '../config/chess-config.service';

@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly chessConfigService: ChessConfigService) {
    const adapter = new PrismaPg({
      connectionString: chessConfigService.getDatabaseURL(),
    });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    console.log('Connected database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();

    console.log('Disconnected database');
  }
}
