import { BrokerService } from '@app/broker';
import { IUserLoginMessage, USER_TOPICS } from '@app/contracts';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersClient {
  constructor(private readonly broker: BrokerService) {}

  async notifyLogin(email: string): Promise<unknown> {
    const payload: IUserLoginMessage = { email };
    return this.broker.send({ topic: USER_TOPICS.LOGIN, payload });
  }
}
