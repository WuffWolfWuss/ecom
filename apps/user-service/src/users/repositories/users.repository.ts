import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { EUserRole } from '../enums/user-role.enum';
import { ICreateUser } from '../interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  /** Includes the password hash — only for credential checks. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();
  }

  existsByRole(role: EUserRole): Promise<boolean> {
    return this.repo.exists({ where: { role } });
  }

  async create(data: ICreateUser): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.repo.update({ id }, { isActive });
  }

  /** Atomically bumps tokenVersion and returns the new value. */
  async incrementTokenVersion(id: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ tokenVersion: () => '"tokenVersion" + 1' })
      .where('id = :id', { id })
      .returning('"tokenVersion"')
      .execute();
    const row = (result.raw as { tokenVersion: number }[])[0];
    if (!row) throw new Error(`User ${id} not found`);
    return row.tokenVersion;
  }
}
