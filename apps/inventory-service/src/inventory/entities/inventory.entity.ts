// inventory/entities/inventory.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { IInventory } from '../interfaces/inventory';

@Entity('inventory')
export class Inventory implements IInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  productId: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  reserved: number; // đang được giữ chỗ, chưa trừ hẳn

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get available(): number {
    return this.stock - this.reserved || 0;
  }
}
