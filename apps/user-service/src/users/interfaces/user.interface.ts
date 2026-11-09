import { EUserRole } from '../enums/user-role.enum';

export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: EUserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
