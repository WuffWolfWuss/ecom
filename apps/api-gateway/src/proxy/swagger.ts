/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SwaggerService {
  private readonly logger = new Logger(SwaggerService.name);
  private mergedDoc: any = null;

  private readonly serviceUrls: { name: string; url: string }[];

  constructor(private readonly config: ConfigService) {
    this.serviceUrls = [
      {
        name: 'User',
        url: config.get('USER_SERVICE_URL', 'http://localhost:3001'),
      },
      {
        name: 'Product',
        url: config.get('PRODUCT_SERVICE_URL', 'http://localhost:3002'),
      },
      {
        name: 'Inventory',
        url: config.get('INVENTORY_SERVICE_URL', 'http://localhost:3003'),
      },
      {
        name: 'Order',
        url: config.get('ORDER_SERVICE_URL', 'http://localhost:3004'),
      },
      {
        name: 'Payment',
        url: config.get('PAYMENT_SERVICE_URL', 'http://localhost:3005'),
      },
    ];
  }

  async buildMergedDoc() {
    const base = {
      openapi: '3.0.0',
      info: {
        title: 'E-Commerce API',
        version: '1.0.0',
        description: 'Aggregated API docs',
      },
      servers: [{ url: 'http://localhost:3000', description: 'API Gateway' }],
      paths: {} as Record<string, any>,
      components: { schemas: {}, securitySchemes: {} } as Record<string, any>,
      tags: [] as any[],
      security: [{ bearerAuth: [] }],
    };

    for (const service of this.serviceUrls) {
      try {
        const { data } = await axios.get(`${service.url}/docs-json`, {
          timeout: 3000,
        });

        // Merge paths
        for (const [path, methods] of Object.entries(data.paths || {})) {
          // Gắn security vào từng operation trong path
          const pathItem = methods as Record<string, any>;
          for (const method of Object.values(pathItem)) {
            if (typeof method === 'object' && method !== null) {
              method.security = [{ bearerAuth: [] }];
            }
          }
          base.paths[path] = methods;
        }

        // Merge schemas — tránh collision bằng cách prefix tên service
        for (const [name, schema] of Object.entries(
          data.components?.schemas || {},
        )) {
          base.components.schemas[name] = schema;
        }

        // Merge tags
        if (data.tags) base.tags.push(...data.tags);

        this.logger.log(`Loaded docs from ${service.name} service`);
      } catch {
        this.logger.warn(
          `Could not load docs from ${service.name} (${service.url}) — skipping`,
        );
      }
    }

    // Thêm Bearer auth
    base.components.securitySchemes = {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    };

    this.mergedDoc = base;
  }

  getDoc() {
    return this.mergedDoc;
  }
}
