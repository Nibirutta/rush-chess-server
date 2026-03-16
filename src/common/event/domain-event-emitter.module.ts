import { Global, Module } from '@nestjs/common';
import { DomainEventEmitterService } from './domain-event-emitter.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [DomainEventEmitterService],
  exports: [DomainEventEmitterService],
})
export class DomainEventEmitterModule {}
