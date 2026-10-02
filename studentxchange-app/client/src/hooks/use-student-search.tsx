import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StudentProfile } from "@shared/schema";

export function useStudentSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: searchResults = [], isLoading: isSearching } = useQuery<StudentProfile[]>({
    queryKey: ['/api/student-profiles/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) {
        return [];
      }
      
      const response = await fetch(`/api/student-profiles/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  const searchStudents = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return {
    searchResults,
    isSearching,
    searchStudents,
    clearSearch
  };
}