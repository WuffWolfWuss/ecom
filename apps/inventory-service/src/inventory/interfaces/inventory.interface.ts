export interface IInventory {
  id: string;
  productId: string;
  stock: number;
  reserved: number; // đang được giữ chỗ, chưa trừ hẳn
  createdAt: Date;
  updatedAt: Date;
}
