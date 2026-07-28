import { OnEvent } from '@nestjs/event-emitter';
import { DomainEventsMap } from './domain.events';
import { OnEventOptions } from '@nestjs/event-emitter/dist/interfaces';

export function OnDomainEvents<K extends keyof DomainEventsMap>(
  event: K,
  eventOptions?: OnEventOptions,
): MethodDecorator {
  return OnEvent(event, eventOptions);
}
