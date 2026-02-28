import { ValidationPipeOptions } from '@nestjs/common';

export const ValidationOptions: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};
