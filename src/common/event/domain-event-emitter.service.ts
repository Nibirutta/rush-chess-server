import { Injectable } from '@nestjs/common';
import { DomainEventsMap } from './domain.events';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DomainEventEmitterService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit<K extends keyof DomainEventsMap>(event: K, payload: DomainEventsMap[K]) {
    return this.eventEmitter.emit(event, payload);
  }
}
