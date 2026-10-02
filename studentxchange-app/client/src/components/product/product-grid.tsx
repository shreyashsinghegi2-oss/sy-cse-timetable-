import { Product } from "@shared/schema";
import ProductCard from "./product-card";

interface ProductGridProps {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductGrid({ products, isLoading = false }: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array(8).fill(0).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 animate-pulse">
            <div className="w-full h-48 sm:h-56 bg-gray-300" />
            <div className="p-4">
              <div className="h-5 w-16 bg-gray-300 rounded mb-2" />
              <div className="h-5 w-3/4 bg-gray-300 rounded mb-2" />
              <div className="h-4 w-2/3 bg-gray-300 rounded mb-2" />
              <div className="mt-2 flex items-center mb-3">
                <div className="h-4 w-12 bg-gray-300 rounded" />
                <div className="ml-auto flex items-center space-x-1">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-4 w-4 bg-gray-300 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="h-5 w-16 bg-gray-300 rounded mb-1" />
                  <div className="h-3 w-12 bg-gray-300 rounded" />
                </div>
                <div className="h-8 w-24 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium text-gray-900">No products found</h3>
        <p className="mt-1 text-sm text-gray-500">Try changing your search or filter criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
