import { BaseEntity } from '@app/database';
import { Entity, Index, Column } from 'typeorm';

@Entity('inventory_confirmations')
@Index(['orderId'], { unique: true })
export class InventoryConfirmation extends BaseEntity {
  @Column() orderId: string;
}
