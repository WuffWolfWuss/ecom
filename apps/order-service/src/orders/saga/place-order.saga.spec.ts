import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceOrderSaga } from './place-order.saga';
import { SagaState, SagaStatus } from '../entities/saga-state.entity';
import { REDIS_CLIENT } from '@app/redis';
import { ESagaStep } from '../enums/saga-steps.enum';
import { AmbiguousRpcException, BusinessRpcException } from '@app/broker';
import {
  ProductClient,
  PaymentClient,
  InventoryClient,
} from '../messaging/clients';

describe('PlaceOrderSaga', () => {
  let saga: PlaceOrderSaga;
  let inventoryClientMock: jest.Mocked<
    Pick<InventoryClient, 'reservation' | 'release' | 'getReservationStatus'>
  >;
  let paymentClientMock: jest.Mocked<
    Pick<PaymentClient, 'paymentCharge' | 'paymentRefund' | 'getPaymentStatus'>
  >;
  let productClientMock: jest.Mocked<Pick<ProductClient, 'productValidate'>>;
  let sagaRepoMock: jest.Mocked<Pick<Repository<SagaState>, 'save' | 'create'>>;
  let redisMock: { set: jest.Mock; del: jest.Mock };

  const input = {
    orderId: 'order-1',
    userId: 'user-1',
    items: [{ productId: 'p1', qty: 2 }],
  };

  const validatedItems = [
    { productId: 'p1', qty: 2, subtotal: 100, name: 'product-1', price: 500 },
  ];

  beforeEach(async () => {
    inventoryClientMock = {
      reservation: jest.fn(),
      release: jest.fn(),
      getReservationStatus: jest.fn(),
    };

    paymentClientMock = {
      paymentCharge: jest.fn(),
      paymentRefund: jest.fn(),
      getPaymentStatus: jest.fn(),
    };

    productClientMock = {
      productValidate: jest.fn(),
    };

    redisMock = { set: jest.fn(), del: jest.fn() };

    sagaRepoMock = {
      save: jest.fn((data) => Promise.resolve(data as SagaState)),
      create: jest.fn((data) => data as SagaState),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaceOrderSaga,
        { provide: InventoryClient, useValue: inventoryClientMock },
        { provide: PaymentClient, useValue: paymentClientMock },
        { provide: ProductClient, useValue: productClientMock },
        { provide: getRepositoryToken(SagaState), useValue: sagaRepoMock },
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    saga = module.get(PlaceOrderSaga);
  });

  afterEach(() => jest.clearAllMocks());

  it('should complete saga successfully when all steps succeed', async () => {
    productClientMock.productValidate.mockResolvedValueOnce(validatedItems);
    inventoryClientMock.reservation.mockResolvedValueOnce({
      success: true,
      reservationId: 'res-1',
    });
    paymentClientMock.paymentCharge.mockResolvedValueOnce({
      success: true,
      transactionId: 'txn-1',
    });

    const result = await saga.execute(input);

    expect(result.total).toBe(100);
    expect(productClientMock.productValidate).toHaveBeenCalledWith(input.items);
    expect(inventoryClientMock.reservation).toHaveBeenCalledWith(
      input.orderId,
      validatedItems,
    );
    expect(paymentClientMock.paymentCharge).toHaveBeenCalledWith(
      input.orderId,
      input.userId,
      100,
    );

    expect(redisMock.set).toHaveBeenCalledWith(
      `saga:timeout:${input.orderId}`,
      'res-1',
      'EX',
      900,
    );
    expect(redisMock.del).toHaveBeenCalledWith(`saga:timeout:${input.orderId}`);

    const lastSave = sagaRepoMock.save.mock.calls.at(-1)[0];
    expect(lastSave.status).toBe(SagaStatus.COMPLETED);
    expect(lastSave.currentStep).toBe(ESagaStep.COMPLETED);
    expect(lastSave.reservationId).toBe('res-1');
    expect(lastSave.transactionId).toBe('txn-1');
  });

  describe('business error', () => {
    it('should compensate only prior steps when reserve fails with business error (out of stock)', async () => {
      productClientMock.productValidate.mockResolvedValueOnce(validatedItems);
      inventoryClientMock.reservation.mockRejectedValueOnce(
        new BusinessRpcException('Out of stock', { code: 'OUT_OF_STOCK' }),
      );

      await expect(saga.execute(input)).rejects.toThrow('Out of stock');

      // Step RESERVE_INVENTORY business-fail -> RESERVE chưa xảy ra, không compensate nó.
      // Step VALIDATE_PRODUCT trước đó cũng là no-op compensate.
      expect(inventoryClientMock.release).not.toHaveBeenCalled();
      expect(paymentClientMock.paymentCharge).not.toHaveBeenCalled();

      const lastSave = sagaRepoMock.save.mock.calls.at(-1)[0];
      expect(lastSave.status).toBe(SagaStatus.COMPENSATED);
    });

    it('should compensate inventory but not payment when payment fails with business error', async () => {
      productClientMock.productValidate.mockResolvedValueOnce(validatedItems);
      inventoryClientMock.reservation.mockResolvedValueOnce({
        success: true,
        reservationId: 'res-1',
      });
      paymentClientMock.paymentCharge.mockRejectedValueOnce(
        new BusinessRpcException('Card declined', { code: 'CARD_DECLINED' }),
      );

      await expect(saga.execute(input)).rejects.toThrow('Card declined');

      // CHARGE_PAYMENT business-fail -> không refund (chưa từng charge thành công)
      expect(paymentClientMock.paymentRefund).not.toHaveBeenCalled();
      // RESERVE_INVENTORY đã thành công trước đó -> phải release, đúng reservationId
      expect(inventoryClientMock.release).toHaveBeenCalledWith('res-1');

      const lastSave = sagaRepoMock.save.mock.calls.at(-1)[0];
      expect(lastSave.status).toBe(SagaStatus.COMPENSATED);
    });
  });

  describe('ambiguous error on RESERVE_INVENTORY', () => {
    it('should compensate using verified reservationId when verify confirms it happened', async () => {
      productClientMock.productValidate.mockResolvedValueOnce(validatedItems);
      inventoryClientMock.reservation.mockRejectedValueOnce(
        new AmbiguousRpcException('timeout', 'inventory.reserve'),
      );
      inventoryClientMock.getReservationStatus.mockResolvedValueOnce({
        exists: true,
        reservationId: 'res-recovered',
      });

      await expect(saga.execute(input)).rejects.toThrow('timeout');

      expect(inventoryClientMock.getReservationStatus).toHaveBeenCalledWith(
        input.orderId,
      );
      // saga.reservationId phải được set lại từ kết quả verify TRƯỚC khi compensate đọc nó
      expect(inventoryClientMock.release).toHaveBeenCalledWith('res-recovered');

      const lastSave = sagaRepoMock.save.mock.calls.at(-1)[0];
      expect(lastSave.status).toBe(SagaStatus.COMPENSATED);
      expect(lastSave.reservationId).toBe('res-recovered');
    });

    it('should NOT compensate reservation when verify confirms it never happened', async () => {
      productClientMock.productValidate.mockResolvedValueOnce(validatedItems);
      inventoryClientMock.reservation.mockRejectedValueOnce(
        new AmbiguousRpcException('timeout', 'inventory.reserve'),
      );
      inventoryClientMock.getReservationStatus.mockResolvedValueOnce({
        exists: false,
      });

      await expect(saga.execute(input)).rejects.toThrow('timeout');

      // happened: false -> step không được đưa vào executedSteps -> không compensate
      expect(inventoryClientMock.release).not.toHaveBeenCalled();

      const lastSave = sagaRepoMock.save.mock.calls.at(-1)[0];
      expect(lastSave.status).toBe(SagaStatus.COMPENSATED);
    });

    it('should keep saga IN_PROGRESS and increment retry count when verify also fails', async () => {
      productClientMock.productValidate.mockResolvedValueOnce(validatedItems);
      inventoryClientMock.reservation.mockRejectedValueOnce(
        new AmbiguousRpcException('timeout', 'inventory.reserve'),
      );
      inventoryClientMock.getReservationStatus.mockRejectedValueOnce(
        new Error('network still down'),
      );

      // Phải throw đúng lỗi GỐC (timeout), không phải lỗi verify
      await expect(saga.execute(input)).rejects.toThrow('timeout');

      // Verify fail -> không biết chắc gì cả -> KHÔNG được compensate
      expect(inventoryClientMock.release).not.toHaveBeenCalled();

      const lastSave = sagaRepoMock.save.mock.calls.at(-1)[0];
      expect(lastSave.status).toBe(SagaStatus.IN_PROGRESS); // không bị set COMPENSATING
      expect(lastSave.verifyRetryCount).toBe(1);
      expect(lastSave.lastError).toContain('Verify failed');
    });
  });
});
