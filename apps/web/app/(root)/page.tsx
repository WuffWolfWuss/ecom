import ProductList from '@/components/ui/shared/product/product-list';
import sampleData from '@/db/sample';
import { productApi } from '@/lib/actions/product.actions';

const Homepage = async () => {
  const res = await productApi.getAll();
  return (
    <>
      <ProductList data={res.items} title="Newest Products"></ProductList>
    </>
  );
};

export default Homepage;
