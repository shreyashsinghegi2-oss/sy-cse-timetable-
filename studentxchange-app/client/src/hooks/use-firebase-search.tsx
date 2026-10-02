import { useState, useEffect } from 'react';
import { firebaseStudentService, FirebaseStudentProfile } from '@/services/firebase-student-service';

export function useFirebaseSearch() {
  const [searchResults, setSearchResults] = useState<FirebaseStudentProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchStudents = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await firebaseStudentService.searchStudents(query);
      setSearchResults(results);
    } catch (error) {
      console.warn('[Search] Firebase search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
  };

  return {
    searchResults,
    isSearching,
    searchStudents,
    clearSearch
  };
}