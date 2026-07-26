import { DomainError } from './domain.errors';

export class PlayerConflictError extends DomainError {}

export class InvalidCredentialsError extends DomainError {}

export class PlayerNotFoundError extends DomainError {}

export class PlayerAlreadyLoggedInError extends DomainError {}
