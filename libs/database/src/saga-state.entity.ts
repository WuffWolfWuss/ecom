import { Entity, Column } from 'typeorm';
import { BaseEntity } from './typeORM';

export enum SagaStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED',
}

@Entity('saga_state')
export class SagaState extends BaseEntity {
  @Column()
  currentStep: string;

  @Column({ type: 'enum', enum: SagaStatus, default: SagaStatus.IN_PROGRESS })
  status: SagaStatus;

  @Column({ nullable: true })
  reservationId: string;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ type: 'jsonb' })
  payload: { userId: string; items: { productId: string; qty: number }[] };

  @Column({ nullable: true })
  lastError: string;

  @Column({ default: 0 })
  verifyRetryCount: number;
}
