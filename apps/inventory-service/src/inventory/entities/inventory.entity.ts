// inventory/entities/inventory.entity.ts
import { Entity, Column } from 'typeorm';
import { IInventory } from '../interfaces/inventory';
import { BaseEntity } from '@app/database';

@Entity('inventory')
export class Inventory extends BaseEntity implements IInventory {
  @Column({ unique: true })
  productId: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  reserved: number; // đang được giữ chỗ, chưa trừ hẳn

  get available(): number {
    return this.stock - this.reserved || 0;
  }
}
