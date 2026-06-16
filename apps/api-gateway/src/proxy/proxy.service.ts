import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { Request } from 'express';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  private readonly services: Record<string, string>;

  constructor(private readonly config: ConfigService) {
    // Map prefix → service URL
    this.services = {
      users: config.get('USER_SERVICE_URL', 'http://localhost:3001'),
      auth: config.get('USER_SERVICE_URL', 'http://localhost:3001'),
      products: config.get('PRODUCT_SERVICE_URL', 'http://localhost:3002'),
      categories: config.get('PRODUCT_SERVICE_URL', 'http://localhost:3002'),
      inventory: config.get('INVENTORY_SERVICE_URL', 'http://localhost:3003'),
      orders: config.get('ORDER_SERVICE_URL', 'http://localhost:3004'),
      payments: config.get('PAYMENT_SERVICE_URL', 'http://localhost:3005'),
    };
  }

  async forward(req: Request, serviceKey: string): Promise<any> {
    const baseUrl = this.services[serviceKey];
    if (!baseUrl)
      throw new BadGatewayException(`Unknown service: ${serviceKey}`);

    const url = `${baseUrl}${req.originalUrl}`;

    const config: AxiosRequestConfig = {
      method: req.method as any,
      url,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        // Forward các header auth đã được Gateway gắn vào
        ...(req.headers['x-user-id'] && {
          'x-user-id': req.headers['x-user-id'],
        }),
        ...(req.headers['x-user-role'] && {
          'x-user-role': req.headers['x-user-role'],
        }),
      },
      // Forward body
      data: req.body,
      // Không throw error khi service trả về 4xx/5xx
      // để Gateway giữ nguyên status code từ service
      validateStatus: () => true,
    };

    try {
      const response = await axios(config);
      return { status: response.status, data: response.data };
    } catch (error) {
      this.logger.error(`Proxy error → ${url}`, error.message);
      throw new BadGatewayException('Service unavailable');
    }
  }
}
