import { Injectable, OnModuleInit } from '@nestjs/common';
import { BrokerEvent, BrokerMessage, BrokerService } from '@app/broker';
import { USER_TOPICS } from '@app/contracts';
import type { IUserLoginMessage, IUserRegisteredEvent } from '@app/contracts';

@Injectable()
export class UsersHandler implements OnModuleInit {
  constructor(private readonly broker: BrokerService) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  @BrokerEvent(USER_TOPICS.REGISTERED)
  async onUserRegistered(payload: IUserRegisteredEvent) {
    console.log('EVENT RECEIVED: ', JSON.stringify(payload));
  }

  @BrokerMessage(USER_TOPICS.LOGIN)
  async loginMessage(data: IUserLoginMessage) {
    console.log('MESSAGE RECEIVED: ', JSON.stringify(data));
    return { available: true };
  }
}
