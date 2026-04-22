import { DomainError } from './domain.errors';

export class MatchNotFoundException extends DomainError {}

export class InvalidMovementException extends DomainError {}

export class PlayerCannotSurrenderException extends DomainError {}
