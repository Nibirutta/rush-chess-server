import { Catch, ArgumentsHost, HttpStatus, Type } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';
import { DomainError } from '../errors/domain.errors';
import {
  FailedTokenValidationError,
  InconsistentTokenInfoError,
  SecretMapEmptyError,
  ValidationTokenMissingError,
} from '../errors/token.errors';
import {
  InvalidPasswordError,
  InvalidUsernameError,
} from '../errors/player.errors';
import {
  PlayerNotFoundError,
  SessionNotFoundError,
} from '../errors/lobby.errors';
import { InputFieldIncorrectError } from '../errors/validation.errors';

@Catch(DomainError)
export class HttpDomainExceptionFilter extends BaseExceptionFilter {
  private readonly errorStatusMapping = new Map<Type<DomainError>, HttpStatus>([
    [FailedTokenValidationError, HttpStatus.FORBIDDEN],
    [SecretMapEmptyError, HttpStatus.INTERNAL_SERVER_ERROR],
    [ValidationTokenMissingError, HttpStatus.NOT_FOUND],
    [InconsistentTokenInfoError, HttpStatus.FORBIDDEN],
    [InvalidPasswordError, HttpStatus.UNAUTHORIZED],
    [InvalidUsernameError, HttpStatus.UNAUTHORIZED],
    [PlayerNotFoundError, HttpStatus.NOT_FOUND],
    [SessionNotFoundError, HttpStatus.NOT_FOUND],
    [InputFieldIncorrectError, HttpStatus.BAD_REQUEST],
  ]);

  catch(error: DomainError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

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
