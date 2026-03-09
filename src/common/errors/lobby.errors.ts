import { DomainError } from './domain.errors';

export class PlayerNotFoundError extends DomainError {}

export class SessionNotFoundError extends DomainError {}

export class InvalidOpponentError extends DomainError {}
