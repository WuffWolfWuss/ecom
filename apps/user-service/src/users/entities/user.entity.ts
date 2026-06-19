import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EUserRole, IUser } from '../interfaces/user';
import { BaseEntity } from '@app/database';

@Entity('users')
export class User extends BaseEntity implements IUser {
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: EUserRole, default: EUserRole.CUSTOMER })
  role: EUserRole;

  @Column({ default: true })
  isActive: boolean;
}
