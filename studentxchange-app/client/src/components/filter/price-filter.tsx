import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";

interface PriceFilterProps {
  initialMin?: string;
  initialMax?: string;
}

export default function PriceFilter({ initialMin = "", initialMax = "" }: PriceFilterProps) {
  const [minPrice, setMinPrice] = useState(initialMin);
  const [maxPrice, setMaxPrice] = useState(initialMax);
  const [location] = useLocation();
  
  const handleApplyFilter = () => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    if (minPrice) {
      params.set('minPrice', minPrice);
    } else {
      params.delete('minPrice');
    }
    
    if (maxPrice) {
      params.set('maxPrice', maxPrice);
    } else {
      params.delete('maxPrice');
    }
    
    const search = params.toString();
    const baseUrl = location.split('?')[0];
    const newUrl = search ? `${baseUrl}?${search}` : baseUrl;
    
    window.location.href = newUrl;
  };
  
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Price Range</h3>
      <div className="flex items-center">
        <div className="relative w-full mr-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">₹</span>
          </div>
          <Input 
            type="number"
            placeholder="Min" 
            className="pl-7 w-full" 
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            min="0"
          />
        </div>
        <span className="text-gray-500">to</span>
        <div className="relative w-full ml-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500">₹</span>
          </div>
          <Input 
            type="number"
            placeholder="Max" 
            className="pl-7 w-full" 
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            min="0"
          />
        </div>
      </div>
    </div>
  );
}
