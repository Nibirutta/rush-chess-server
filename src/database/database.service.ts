import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env.MYSQL_DATABASE_HOST,
      user: process.env.MYSQL_DATABASE_USER,
      password: process.env.MYSQL_ROOT_PASSWORD,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
