import { Injectable, OnModuleInit } from '@nestjs/common';
import { BrokerEvent, BrokerMessage, BrokerService } from '@app/broker';

@Injectable()
export class UserEventHandler implements OnModuleInit {
  constructor(private readonly broker: BrokerService) {}

  async onModuleInit() {
    await this.broker.subscribe([this]);
  }

  @BrokerEvent('user.registered')
  async onUserRegistered(payload: { id: string; email: string }) {
    console.log('EVENT RECEIVED: ', JSON.stringify(payload));
  }

   @BrokerMessage('user.login')
  async loginMessage(data: any) {
    console.log('MESSAGE RECEIVED: ', JSON.stringify(data));
    return { available: true };
  }
}