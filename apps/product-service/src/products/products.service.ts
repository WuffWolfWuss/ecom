import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { BrokerService } from '@app/broker';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly elastic: ElasticsearchService,
    private readonly broker: BrokerService,
  ) {}

  async create(dto: CreateProductDto) {
    const product = await this.repo.create(dto);

    // Index vào Elasticsearch để search
    await this.indexToElastic(product);

    // Publish event để Inventory service tạo stock record
    await this.broker.publish({
      topic: 'product.created',
      payload: { productId: product._id.toString(), name: product.name },
    });

    return product;
  }

  async findOne(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findMany(query: QueryProductDto) {
    // Có search query thì dùng Elasticsearch
    if (query.search) {
      return this.searchWithElastic(query);
    }
    return this.repo.findMany(query);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.repo.update(id, dto);
    if (!product) throw new NotFoundException('Product not found');

    // Sync lại Elasticsearch
    await this.indexToElastic(product);

    return product;
  }

  async remove(id: string) {
    await this.repo.delete(id);
    await this.elastic.delete({ index: 'products', id }).catch(() => {});
  }

  // Được gọi bởi Order service qua NATS khi checkout
  async validateProducts(items: { productId: string; qty: number }[]) {
    const ids = items.map(i => i.productId);
    const products = await this.repo.findByIds(ids);

    return items.map(item => {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
      return {
        productId: item.productId,
        name: product.name,
        price: product.discountPrice || product.price,
        qty: item.qty,
        subtotal: (product.discountPrice || product.price) * item.qty,
      };
    });
  }

  private async indexToElastic(product: any) {
    await this.elastic.index({
      index: 'products',
      id: product._id.toString(),
      document: {
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId?.toString(),
        isActive: product.isActive,
      },
    });
  }

  private async searchWithElastic(query: QueryProductDto) {
    const must: any[] = [
      {
        multi_match: {
          query: query.search,
          fields: ['name^3', 'description'], // name quan trọng hơn 3x
          fuzziness: 'AUTO',                 // typo tolerance
        },
      },
    ];

    if (query.categoryId) {
      must.push({ term: { categoryId: query.categoryId } });
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const range: any = {};
      if (query.minPrice !== undefined) range.gte = query.minPrice;
      if (query.maxPrice !== undefined) range.lte = query.maxPrice;
      must.push({ range: { price: range } });
    }

    const result = await this.elastic.search({
      index: 'products',
      from: (query.page - 1) * query.limit,
      size: query.limit,
      query: { bool: { must, filter: [{ term: { isActive: true } }] } },
    });

    const ids = result.hits.hits.map((h: any) => h._id);
    const items = await this.repo.findByIds(ids);
    return { items, total: (result.hits.total as any).value, page: query.page, limit: query.limit };
  }
}