import { DomainError } from './domain.errors';

export class FailedTokenValidationError extends DomainError {}

export class SecretMapEmptyError extends DomainError {}

export class TokenNotFoundError extends DomainError {}

export class InconsistentTokenInfoError extends DomainError {}
