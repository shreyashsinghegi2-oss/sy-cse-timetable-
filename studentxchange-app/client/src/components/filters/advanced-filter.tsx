import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { PRODUCT_CATEGORIES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FilterState {
  categories: string[];
  priceRange: [number, number];
  condition: string[];
  verifiedSellers: boolean;
  freeDelivery: boolean;
  rating: number;
  university: string;
}

interface AdvancedFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
}

export function AdvancedFilter({ filters, onFiltersChange, activeFilterCount }: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const conditions = [
    "Brand New",
    "Like New", 
    "Very Good",
    "Good",
    "Acceptable"
  ];

  const universities = [
    "IIT Delhi",
    "IIT Mumbai",
    "IIT Bangalore",
    "Delhi University",
    "Mumbai University",
    "JNU",
    "BITS Pilani",
    "VIT",
    "SRM University",
    "Manipal University"
  ];

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: [0, 5000],
      condition: [],
      verifiedSellers: false,
      freeDelivery: false,
      rating: 0,
      university: ""
    });
  };

  const removeCategory = (category: string) => {
    updateFilter('categories', filters.categories.filter(c => c !== category));
  };

  const removeCondition = (condition: string) => {
    updateFilter('condition', filters.condition.filter(c => c !== condition));
  };

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map(category => (
            <Badge key={category} variant="secondary" className="flex items-center gap-1">
              {category}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeCategory(category)} />
            </Badge>
          ))}
          {filters.condition.map(condition => (
            <Badge key={condition} variant="secondary" className="flex items-center gap-1">
              {condition}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeCondition(condition)} />
            </Badge>
          ))}
          {filters.verifiedSellers && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Verified Sellers
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('verifiedSellers', false)} />
            </Badge>
          )}
        </div>
      )}

      {/* Filter Panel */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Categories */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Categories</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PRODUCT_CATEGORIES.map(category => (
                    <label key={category} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={filters.categories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilter('categories', [...filters.categories, category]);
                          } else {
                            updateFilter('categories', filters.categories.filter(c => c !== category));
                          }
                        }}
                      />
                      <span className="text-sm">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Price Range: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
                </Label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
                  max={5000}
                  min={0}
                  step={50}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange[0]}
                    onChange={(e) => updateFilter('priceRange', [parseInt(e.target.value) || 0, filters.priceRange[1]])}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Max" 
                    value={filters.priceRange[1]}
                    onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value) || 5000])}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Condition</Label>
                <div className="grid grid-cols-2 gap-2">
                  {conditions.map(condition => (
                    <label key={condition} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={filters.condition.includes(condition)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilter('condition', [...filters.condition, condition]);
                          } else {
                            updateFilter('condition', filters.condition.filter(c => c !== condition));
                          }
                        }}
                      />
                      <span className="text-sm">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* University */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">University</Label>
                <Select value={filters.university} onValueChange={(value) => updateFilter('university', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Universities</SelectItem>
                    {universities.map(uni => (
                      <SelectItem key={uni} value={uni}>{uni}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trust Filters */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Trust & Safety</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={filters.verifiedSellers}
                      onCheckedChange={(checked) => updateFilter('verifiedSellers', !!checked)}
                    />
                    <span className="text-sm">Verified sellers only</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={filters.freeDelivery}
                      onCheckedChange={(checked) => updateFilter('freeDelivery', !!checked)}
                    />
                    <span className="text-sm">Free delivery</span>
                  </label>
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Minimum Rating: {filters.rating} stars
                </Label>
                <Slider
                  value={[filters.rating]}
                  onValueChange={(value) => updateFilter('rating', value[0])}
                  max={5}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
              </div>

            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}