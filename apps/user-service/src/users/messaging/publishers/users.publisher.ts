import { BrokerService } from '@app/broker';
import { IUserRegisteredEvent, USER_TOPICS } from '@app/contracts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersPublisher {
  constructor(private readonly broker: BrokerService) {}

  async userRegistered(id: string, email: string): Promise<void> {
    const payload: IUserRegisteredEvent = { id, email };
    await this.broker.publish({ topic: USER_TOPICS.REGISTERED, payload });
  }
}
