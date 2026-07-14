import { productApi } from '@/lib/actions/product.actions';

const ProductDetailPage = async (props: {
  params: Promise<{ productId: string }>;
}) => {
  const { productId } = await props.params;
  const product = await productApi.getById(productId);
  if (!product) return <>NOT FOUND</>;

  return (
    <>
      <section>
        <div className="grid grid-cols-1 md:grid-cols-5">
          {/* image collumn */}
          <div className="col-span-2">{/* image component */}</div>
          {/* detail collumn */}
          <div className="col-span-2 p-5">
            <div className="flex flex-col gap-6">
              <p>{product.name}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductDetailPage;
