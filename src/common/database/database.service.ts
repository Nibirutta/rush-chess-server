import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'src/generated/prisma/client';
import { ChessConfigService } from '../config/chess-config.service';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  constructor(private readonly chessConfigService: ChessConfigService) {
    const adapter = new PrismaPg({
      connectionString: chessConfigService.getDatabaseURL(),
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();

    console.log('Connected to the database');
  }
}
