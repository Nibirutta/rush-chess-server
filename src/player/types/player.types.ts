import { Player } from 'src/generated/prisma/client';
import { COOKIE_NAMES } from '@app/common';

export type LoggedPlayer = {
  profile: Omit<Player, 'hashedPassword'>;
  [COOKIE_NAMES.ACCESS_TOKEN]: string;
  [COOKIE_NAMES.SESSION_TOKEN]: string;
};
