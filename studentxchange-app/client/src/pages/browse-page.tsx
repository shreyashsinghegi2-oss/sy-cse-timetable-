import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, Filter, FileText, Image, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MarketplaceProductSkeleton } from "@/components/ui/skeletons";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Product, PRODUCT_CATEGORIES } from "@shared/schema";
import Header from "@/components/layout/header";
import { EnhancedSEO } from "@/components/seo/enhanced-seo";
import { useDebounce } from "@/hooks/use-debounce";

const PAGE_SIZE = 6;

interface FilterState {
  categories: string[];
  priceRange: [number, number];
  condition: string[];
  rating: number;
}

export default function BrowsePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOption, setSortOption] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    priceRange: [0, 5000],
    condition: [],
    rating: 0,
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 60000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
  });

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        product.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      const isAvailable = product.quantity > 0;

      const matchesAdvancedCategories =
        filters.categories.length === 0 ||
        filters.categories.includes(product.category);

      const productPrice = product.price ? Number(product.price) : 0;
      const matchesPriceRange =
        productPrice >= filters.priceRange[0] &&
        productPrice <= filters.priceRange[1];

      const matchesCondition =
        filters.condition.length === 0 ||
        filters.condition.includes(product.condition);

      const productRating = Number(product.rating) || 0;
      const matchesRating = productRating >= filters.rating;

      return (
        matchesSearch &&
        matchesCategory &&
        isAvailable &&
        matchesAdvancedCategories &&
        matchesPriceRange &&
        matchesCondition &&
        matchesRating
      );
    });
  }, [products, debouncedSearchTerm, selectedCategory, filters]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortOption) {
        case "price-asc":
          return Number(a.price || 0) - Number(b.price || 0);
        case "price-desc":
          return Number(b.price || 0) - Number(a.price || 0);
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "popular":
          return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        default:
          return 0;
      }
    });
  }, [filteredProducts, sortOption]);

  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, visibleCount),
    [sortedProducts, visibleCount]
  );

  const hasMore = visibleCount < sortedProducts.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearchTerm, selectedCategory, sortOption, filters]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSortOption("newest");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EnhancedSEO
        title="Browse Educational Materials - Books, Notes & Calculators | StudentXchange"
        description="Browse thousands of educational materials including textbooks, study notes, calculators, and lab equipment. Find the best deals from students across India."
        keywords="buy books online, study materials, educational books, textbooks, calculators, lab equipment, student marketplace"
        canonicalUrl="/browse"
      />
      <Header />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Browse All Items</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Discover educational materials from students across India
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="search-bar"
                type="search"
                placeholder="Search books, notes, calculators..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="categories" className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between px-1">
          <p className="text-gray-600 text-sm sm:text-base">
            {isLoading
              ? "Loading..."
              : `Showing ${visibleProducts.length} of ${sortedProducts.length} items`}
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {isLoading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <MarketplaceProductSkeleton key={i} />
              ))
            : sortedProducts.length === 0
            ? (
                <div className="col-span-full text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-base sm:text-lg">
                    No items found matching your criteria.
                  </p>
                  <Button onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                </div>
              )
            : visibleProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < PAGE_SIZE}
                />
              ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-8 mt-4" />

        {/* Loading more indicator */}
        {hasMore && !isLoading && (
          <div className="flex items-center justify-center py-6 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm text-gray-500">Loading more items...</span>
          </div>
        )}

        {/* All loaded indicator */}
        {!hasMore && !isLoading && sortedProducts.length > PAGE_SIZE && (
          <div className="text-center py-6 text-sm text-gray-400">
            All {sortedProducts.length} items loaded
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

function ProductCard({ product, priority = false }: ProductCardProps) {
  const hasImages = product?.images && product.images.length > 0;
  const imageUrl = hasImages && product.images
    ? product.images[0].startsWith("http")
      ? product.images[0]
      : `/uploads/${product.images[0]}`
    : null;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="bg-gray-100 h-40 sm:h-48 overflow-hidden relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=500&h=500&fit=crop";
            }}
          />
        ) : product?.files && product.files.length > 0 ? (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
            <FileText className="h-8 sm:h-12 w-8 sm:w-12 text-blue-500 mb-1 sm:mb-2" />
            <span className="text-xs sm:text-sm font-medium text-blue-700">Document</span>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <SearchIcon className="w-8 sm:w-12 h-8 sm:h-12 text-gray-400" />
          </div>
        )}

        {/* File count indicators */}
        {((product.images?.length || 0) > 0 || (product.files?.length || 0) > 0) && (
          <div className="absolute top-1 right-1 flex gap-1">
            {product.images && product.images.length > 0 && (
              <div className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Image className="h-2 w-2" />
                {product.images.length}
              </div>
            )}
            {product.files && product.files.length > 0 && (
              <div className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <FileText className="h-2 w-2" />
                {product.files.length}
              </div>
            )}
          </div>
        )}
      </div>

      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {product.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {product.condition}
          </Badge>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm sm:text-base">
          {product.title}
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="text-lg sm:text-xl font-bold text-blue-600">
            ₹{Number(product.price || 0).toLocaleString("en-IN")}
          </div>
          <Link href={`/product/${product.id}`}>
            <Button className="text-xs sm:text-sm px-3 sm:px-4 card-action-btn">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
