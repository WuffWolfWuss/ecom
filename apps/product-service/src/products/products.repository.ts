import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(Product.name)
    private readonly model: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    return this.model.create(dto);
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.model.findById(id).populate('categoryId').lean();
  }

  async findMany(query: QueryProductDto) {
    const filter: QueryFilter<ProductDocument> = { isActive: true };

    if (query.categoryId) filter.categoryId = query.categoryId;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = query.minPrice;
      if (query.maxPrice !== undefined) filter.price.$lte = query.maxPrice;
    }

    const skip = (query.page - 1) * query.limit;
    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort as any)
        .skip(skip)
        .limit(query.limit)
        .populate('categoryId')
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findByIds(ids: string[]): Promise<ProductDocument[]> {
    return this.model.find({ _id: { $in: ids } }).lean();
  }

  async update(id: string, data: Partial<Product>): Promise<ProductDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { isActive: false });
  }

  async incrementSoldCount(id: string, qty: number): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $inc: { soldCount: qty } });
  }
}