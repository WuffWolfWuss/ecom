import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import { Request } from 'express';
import { INTERNAL_AUTH_HEADER, USER_CONTEXT_HEADERS } from '@app/contracts';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  private readonly services: Record<string, string>;
  private readonly internalSecret: string;

  constructor(private readonly config: ConfigService) {
    const secret = config.get<string>('INTERNAL_SECRET');
    if (!secret) throw new Error('INTERNAL_SECRET is not set');
    this.internalSecret = secret;

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
      // Only these headers reach the services. The x-user-* values were set by
      // the gateway's auth middleware (client-supplied copies are stripped).
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        [INTERNAL_AUTH_HEADER]: this.internalSecret,
        'x-forwarded-for': req.ip,
        ...(req.headers['user-agent'] && {
          'user-agent': req.headers['user-agent'],
        }),
        ...Object.fromEntries(
          Object.values(USER_CONTEXT_HEADERS)
            .filter((h) => req.headers[h])
            .map((h) => [h, req.headers[h]]),
        ),
      },
      data: req.body,
      validateStatus: () => true, // keep status code từ service
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
