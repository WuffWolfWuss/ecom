import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../card';
import { IProduct } from '@/lib/interfaces/product';

const ProductCard = ({ product }: { product: IProduct }) => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="p-0 items-center">
        <Link href={`/product/${product._id}`}></Link>
        <Image
          src={product.images[0] || '/images/sample-products/p1-1.jpg'}
          alt={product.name}
          height={300}
          width={300}
          priority={true}
        ></Image>
      </CardHeader>
      <CardContent className="p-4 grid gap-4">
        <div className="text-xs">{product.name}</div>
        <Link href={`/product/${product._id}`}>
          <h2 className="text-sm font-medium">{product.name}</h2>
        </Link>
        <div className="flex-between gap-4">
          <p>{product.soldCount}</p>
          {product.availableStock > 0 ? (
            <p className="font-bold">{product.price}</p>
          ) : (
            <p>out of stocks</p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
