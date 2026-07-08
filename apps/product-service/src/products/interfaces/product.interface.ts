export interface IProduct {
  _id?: any;

  name: string;

  description?: string;

  price: number;

  discountPrice?: number;

  categoryId: any;

  images?: string[];

  attributes?: Record<string, any>;

  isActive?: boolean;

  soldCount?: number;

  createdBy: string;

  availableStock?: number;

  stockUpdatedAt?: Date;
}
