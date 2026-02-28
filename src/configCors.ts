import { allowedOrigins } from './allowedOrigins';

export const corsOptions = {
  origin: (origin: string, callback: (errors, options?) => void) => {
    // LATER - Remove !origin when its done
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Origin not allowed by CORS policy!'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
