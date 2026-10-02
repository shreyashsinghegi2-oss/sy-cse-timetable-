import { Checkbox } from "@/components/ui/checkbox";
import { PRODUCT_CONDITIONS } from "@shared/schema";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ConditionFilterProps {
  selectedConditions?: string[];
}

export default function ConditionFilter({ selectedConditions = [] }: ConditionFilterProps) {
  const [conditions, setConditions] = useState<Record<string, boolean>>(
    PRODUCT_CONDITIONS.reduce((acc, condition) => {
      acc[condition] = selectedConditions.includes(condition);
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [location] = useLocation();
  
  useEffect(() => {
    // Update checkboxes when prop changes
    const newConditions = PRODUCT_CONDITIONS.reduce((acc, condition) => {
      acc[condition] = selectedConditions.includes(condition);
      return acc;
    }, {} as Record<string, boolean>);
    
    setConditions(newConditions);
  }, [selectedConditions]);
  
  const handleChange = (condition: string, checked: boolean) => {
    setConditions((prev) => ({
      ...prev,
      [condition]: checked,
    }));
  };
  
  const handleApplyFilter = () => {
    const selectedConditions = Object.entries(conditions)
      .filter(([_, isChecked]) => isChecked)
      .map(([condition]) => condition);
    
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    if (selectedConditions.length > 0) {
      params.set('conditions', selectedConditions.join(','));
    } else {
      params.delete('conditions');
    }
    
    const search = params.toString();
    const baseUrl = location.split('?')[0];
    const newUrl = search ? `${baseUrl}?${search}` : baseUrl;
    
    window.location.href = newUrl;
  };
  
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-2">Condition</h3>
      <div className="space-y-2">
        {PRODUCT_CONDITIONS.map((condition) => (
          <div key={condition} className="flex items-center">
            <Checkbox 
              id={condition} 
              checked={conditions[condition]} 
              onCheckedChange={(checked) => handleChange(condition, checked as boolean)}
            />
            <label htmlFor={condition} className="ml-2 text-sm text-gray-700">
              {condition}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
