import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IProduct } from '../interfaces/product.interface';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true, collection: 'products' })
export class Product implements IProduct {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0, default: 0 })
  discountPrice: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop([String])
  images: string[];

  // { color: 'red', size: 'XL' } or { storage: '256GB', ram: '8GB' }
  @Prop({ type: Object, default: {} })
  attributes: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  soldCount: number;

  @Prop(String)
  createdBy: string;

  @Prop({ default: 0 })
  availableStock: number;

  @Prop({ default: null })
  stockUpdatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Text index cho search
ProductSchema.index({ name: 'text', description: 'text' });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isActive: 1 });
