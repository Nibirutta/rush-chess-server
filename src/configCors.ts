import { ForbiddenException } from '@nestjs/common';
import { allowedOrigins } from './allowedOrigins';

export const corsOptions = {
  origin: (origin, callback) => {
    // LATER - Remove !origin when its done
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new ForbiddenException('Origin not allowed by CORS policy!'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
