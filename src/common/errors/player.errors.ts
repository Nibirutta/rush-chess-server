import { DomainError } from './domain.errors';

export class InvalidUsernameError extends DomainError {}

export class InvalidPasswordError extends DomainError {}

export class PlayerNotFoundError extends DomainError {}
