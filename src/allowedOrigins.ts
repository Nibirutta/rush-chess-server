import { config } from 'dotenv';

config();
const origins: string = process.env.ORIGINS ?? '';

export const allowedOrigins = origins.split(',');
