import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { EUserRole } from './enums/user-role.enum';
import { ICreateUser, IPublicUser } from './interfaces/user.interface';
import { UsersRepository } from './repositories/users.repository';
import { UsersPublisher } from './messaging/publishers/users.publisher';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly publisher: UsersPublisher,
  ) {}

  async create(input: ICreateUser): Promise<User> {
    const exists = await this.repo.findByEmail(input.email);
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await this.repo.create({ ...input, password: hashed });

    await this.publisher.userRegistered(user.id, user.email);

    return user;
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo.findByEmailWithPassword(email);
  }

  async findById(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  existsByRole(role: EUserRole): Promise<boolean> {
    return this.repo.existsByRole(role);
  }

  setActive(id: string, isActive: boolean): Promise<void> {
    return this.repo.setActive(id, isActive);
  }

  incrementTokenVersion(id: string): Promise<number> {
    return this.repo.incrementTokenVersion(id);
  }

  toPublic(user: User): IPublicUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, tokenVersion, ...rest } = user;
    return rest;
  }
}
