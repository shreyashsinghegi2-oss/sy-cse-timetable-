import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collabFetch } from "@/lib/firebase";

export interface CollabSearchResult {
  id: string;
  uid: string;
  userId: number;
  role: 'Student' | 'Club' | 'Community' | 'Company';
  email: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  
  // Student-specific
  college?: string;
  currentCourse?: string;
  skills?: string[];
  
  // Club-specific
  clubName?: string;
  category?: string;
  
  // Community-specific
  communityName?: string;
  missionVision?: string;
  
  // Company-specific
  companyName?: string;
  industryType?: string;
}

export function useCollabSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: searchResults = [], isLoading: isSearching, error } = useQuery<CollabSearchResult[]>({
    queryKey: ['/api/collab/social/profiles/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 1) {
        return [];
      }
      
      const url = `/api/collab/social/profiles/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await collabFetch(url);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `Search failed (HTTP ${response.status})`);
      }
      return response.json();
    },
    enabled: searchQuery.length >= 1,
    staleTime: 30 * 1000, // 30 seconds
  });

  const searchProfiles = (query: string) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return {
    searchResults,
    isSearching,
    error,
    searchProfiles,
    clearSearch
  };
}
