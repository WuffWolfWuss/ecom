import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async create(dto: CreateCategoryDto) {
    return this.repo.create(dto);
  }

  async findOne(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findMany(query: QueryCategoryDto) {
    return this.repo.findMany(query);
  }

  async update(id: string, dto: any) {
    const product = await this.repo.update(id, dto);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
