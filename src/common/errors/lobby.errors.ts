import { DomainError } from './domain.errors';

export class PlayerIsOfflineError extends DomainError {}

export class InviteNotFoundError extends DomainError {}

export class InvalidOpponentError extends DomainError {}
