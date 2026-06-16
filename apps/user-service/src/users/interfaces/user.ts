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

export enum EUserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  PRODUCER = 'PRODUCER',
}
