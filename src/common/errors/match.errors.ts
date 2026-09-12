import { DomainError } from './domain.errors';

export class MatchNotFoundException extends DomainError {}

export class InvalidMovementException extends DomainError {}

export class InteractionNotAllowedException extends DomainError {}

export class CannotRequestDrawException extends DomainError {}
