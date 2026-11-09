import { Entity, Column } from 'typeorm';
import { EUserRole } from '../enums/user-role.enum';
import { IUser } from '../interfaces/user.interface';
import { BaseEntity } from '@app/database';

@Entity('users')
export class User extends BaseEntity implements IUser {
  @Column({ unique: true })
  email: string;

  // Not loaded unless explicitly selected (UsersRepository.findByEmailWithPassword)
  @Column({ select: false })
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: EUserRole, default: EUserRole.CUSTOMER })
  role: EUserRole;

  @Column({ default: true })
  isActive: boolean;

  /**
   * Bumped to revoke every token of the user at once (admin revoke,
   * deactivate, logout-all). Mirrored in Redis for the gateway.
   */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;
}
