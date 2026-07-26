import { CookieOptions } from 'express';

export const DomainCookieOptions = (maxAge: number): CookieOptions => {
  return {
    secure: true,
    httpOnly: true,
    maxAge: maxAge,
    sameSite: 'none',
  };
};

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  SESSION_TOKEN: 'session_token',
  RESET_TOKEN: 'reset_token',
} as const;
