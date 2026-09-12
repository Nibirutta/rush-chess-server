import { Catch, ArgumentsHost, HttpStatus, Type } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { DomainError } from '../errors/domain.errors';
import {
  FailedTokenValidationError,
  InconsistentTokenInfoError,
  SecretMapEmptyError,
  TokenNotFoundError,
} from '../errors/token.errors';
import {
  InvalidCredentialsError,
  PlayerAlreadyLoggedInError,
  PlayerNotFoundError,
  PlayerConflictError,
} from '../errors/player.errors';
import {
  InvalidOpponentError,
  PlayerIsOfflineError,
  InviteNotFoundError,
} from '../errors/lobby.errors';
import { InputFieldIncorrectError } from '../errors/validation.errors';
import { InteractionNotAllowedException } from '../errors/match.errors';

@Catch(DomainError)
export class HttpDomainExceptionFilter extends BaseExceptionFilter {
  private readonly errorStatusMapping = new Map<Type<DomainError>, HttpStatus>([
    [SecretMapEmptyError, HttpStatus.INTERNAL_SERVER_ERROR],
    [InconsistentTokenInfoError, HttpStatus.FORBIDDEN],
    [FailedTokenValidationError, HttpStatus.FORBIDDEN],
    [InvalidCredentialsError, HttpStatus.UNAUTHORIZED],
    [PlayerIsOfflineError, HttpStatus.NOT_FOUND],
    [PlayerNotFoundError, HttpStatus.NOT_FOUND],
    [InviteNotFoundError, HttpStatus.NOT_FOUND],
    [TokenNotFoundError, HttpStatus.NOT_FOUND],
    [InputFieldIncorrectError, HttpStatus.BAD_REQUEST],
    [InvalidOpponentError, HttpStatus.BAD_REQUEST],
    [PlayerAlreadyLoggedInError, HttpStatus.FORBIDDEN],
    [PlayerConflictError, HttpStatus.CONFLICT],
    [InteractionNotAllowedException, HttpStatus.FORBIDDEN],
    [TokenNotFoundError, HttpStatus.NOT_FOUND],
  ]);

  catch(error: DomainError, host: ArgumentsHost): void {
    const response: Response = host.switchToHttp().getResponse<Response>();

    const errorClass = error.constructor as Type<DomainError>;
    const status =
      this.errorStatusMapping.get(errorClass) ||
      HttpStatus.INTERNAL_SERVER_ERROR;

    const body = {
      statusCode: status,
      message: error.message,
      error: error.name,
      timestamp: new Date().toISOString(),
      ...(error.body ? { details: error.body } : {}),
    };

    response.status(status).json(body);
  }
}
