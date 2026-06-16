/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { All, Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { Public } from '@app/common';
import { SwaggerService } from './swagger';

@Controller()
export class ProxyController {
  constructor(
    private readonly proxyService: ProxyService,
    private readonly swagger: SwaggerService,
  ) {}

  // Public routes — không cần auth
  @Public()
  @All('auth/*path')
  proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'auth');
  }

  @Public()
  @All('auth')
  proxyAuthRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'auth');
  }

  @Public()
  @All('products/*path')
  proxyProducts(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'products');
  }

  @Public()
  @All('products')
  proxyProductsRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'products');
  }

  @Public()
  @All('categories/*path')
  proxyCategories(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'categories');
  }

  @Public()
  @All('categories')
  proxyCategoriesRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'categories');
  }

  // Protected routes — cần JWT
  @All('users/*path')
  proxyUsers(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'users');
  }

  @All('users')
  proxyUsersRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'users');
  }

  @All('orders/*path')
  proxyOrders(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'orders');
  }

  @All('orders')
  proxyOrdersRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'orders');
  }

  @All('payments/*path')
  proxyPayments(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'payments');
  }

  @All('payments')
  proxyPaymentsRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'payments');
  }

  @All('inventory/*path')
  proxyInventory(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'inventory');
  }

  @All('inventory')
  proxyInventoryRoot(@Req() req: Request, @Res() res: Response) {
    return this.pipe(req, res, 'inventory');
  }

  @Public()
  @Post('docs/reload')
  async reloadDocs() {
    await this.swagger.buildMergedDoc();
    return { message: 'Swagger docs reloaded' };
  }

  private async pipe(req: Request, res: Response, service: string) {
    const { status, data } = await this.proxyService.forward(req, service);
    return res.status(status).json(data);
  }
}
