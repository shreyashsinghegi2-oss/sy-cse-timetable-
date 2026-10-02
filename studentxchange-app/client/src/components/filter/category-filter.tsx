import { PRODUCT_CATEGORIES } from "@shared/schema";
import { Link, useLocation } from "wouter";

interface CategoryFilterProps {
  selectedCategory?: string;
  counts?: Record<string, number>;
}

export default function CategoryFilter({ selectedCategory, counts = {} }: CategoryFilterProps) {
  const [location] = useLocation();
  
  // Function to build the URL with correct query parameters
  const getCategoryUrl = (category: string | null) => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    
    // Keep other existing query parameters
    const search = params.toString();
    const baseUrl = location.split('?')[0];
    return search ? `${baseUrl}?${search}` : baseUrl;
  };
  
  // Total count for all categories
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0) || 256;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
      <h2 className="font-semibold text-lg mb-3">Categories</h2>
      
      {/* Mobile: Horizontal scrolling categories */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Link href={getCategoryUrl(null)}>
            <a className={`flex items-center whitespace-nowrap px-3 py-2 rounded-full text-sm border ${!selectedCategory ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>
              <span>All</span>
              <span className="ml-2 bg-white text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            </a>
          </Link>
          {PRODUCT_CATEGORIES.map((category) => (
            <Link key={category} href={getCategoryUrl(category)}>
              <a className={`flex items-center whitespace-nowrap px-3 py-2 rounded-full text-sm border ${selectedCategory === category ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}>
                <span>{category}</span>
                <span className="ml-2 bg-white text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {counts[category] || 0}
                </span>
              </a>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Desktop: Vertical list */}
      <div className="hidden lg:block">
        <ul className="space-y-2">
          <li>
            <Link href={getCategoryUrl(null)}>
              <a className={`flex items-center p-2 rounded-lg ${!selectedCategory ? 'text-primary font-medium bg-primary/10' : 'text-gray-700 hover:text-primary hover:bg-gray-50'}`}>
                <span>All Categories</span>
                <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {totalCount}
                </span>
              </a>
            </Link>
          </li>
          {PRODUCT_CATEGORIES.map((category) => (
            <li key={category}>
              <Link href={getCategoryUrl(category)}>
                <a className={`flex items-center p-2 rounded-lg ${selectedCategory === category ? 'text-primary font-medium bg-primary/10' : 'text-gray-700 hover:text-primary hover:bg-gray-50'}`}>
                  <span>{category}</span>
                  <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {counts[category] || 0}
                  </span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
