import { EUserRole } from '../enums/user-role.enum';

export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: EUserRole;
  isActive: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Input for UsersService.create — the role is decided by the server, never the client. */
export interface ICreateUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: EUserRole;
}

/** User as returned by the API — never includes the password hash. */
export type IPublicUser = Omit<IUser, 'password' | 'tokenVersion'>;
