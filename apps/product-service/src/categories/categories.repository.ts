import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly model: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    return this.model.create(dto);
  }

  async findById(id: string): Promise<CategoryDocument | null> {
    return this.model.findById(id).lean();
  }

  async findMany(query: QueryCategoryDto) {
    const filter: QueryFilter<CategoryDocument> = { isActive: true };
    const skip = (query.page - 1) * query.limit;
    const sort = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort as any)
        .skip(skip)
        .limit(query.limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async findByIds(ids: string[]): Promise<CategoryDocument[]> {
    return this.model.find({ _id: { $in: ids } }).lean();
  }

  async update(
    id: string,
    data: Partial<Category>,
  ): Promise<CategoryDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { isActive: false });
  }

  async incrementSoldCount(id: string, qty: number): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $inc: { soldCount: qty } });
  }
}
