import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, ArrowLeft } from "lucide-react";
import { SearchSkeleton } from "@/components/ui/skeletons";
import { useCollabSearch } from "@/hooks/use-collab-search";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function CollabSearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { searchResults, isSearching, searchProfiles, error: searchError } = useCollabSearch();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 1) {
      searchProfiles(debouncedQuery);
    }
  }, [debouncedQuery, searchProfiles]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header with search bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="p-0 h-8 w-8"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students, clubs, communities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
                data-testid="input-mobile-search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="block w-1.5 h-1.5 rounded-full bg-gray-400"
                      style={{ animation: `skeleton-shimmer 0.9s ease ${i * 0.15}s infinite alternate` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="px-4 py-4">
        {searchQuery.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Search for students, clubs, or communities</p>
          </div>
        ) : isSearching ? (
          <SearchSkeleton count={5} />
        ) : searchError ? (
          <div className="text-center py-12 text-destructive">
            <p>Search failed: {searchError instanceof Error ? searchError.message : "Please try again."}</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-2">
            {searchResults.map((result: any) => {
              // Get display name based on profile type
              const displayName = result.role === 'Student' ? result.name :
                                result.role === 'Club' ? result.clubName :
                                result.role === 'Community' ? result.communityName :
                                result.role === 'Company' ? result.companyName :
                                result.name;
              
              // Use /u/:username for profiles with username, else fall back to uid-based route
              const navUrl = result.username ? `/u/${result.username}` : `/collab-profile/${result.id}`;
              
              // Get subtitle based on role
              const subtitle = result.role === 'Student' ? `${result.currentCourse || ''} • ${result.college || ''}` :
                              result.role === 'Club' ? result.category :
                              result.role === 'Community' ? result.category :
                              result.role === 'Company' ? result.industryType :
                              '';
              
              // Get badge color based on role
              const badgeColor = result.role === 'Student' ? 'bg-blue-500' :
                                result.role === 'Club' ? 'bg-blue-500' :
                                result.role === 'Community' ? 'bg-green-500' :
                                'bg-orange-500';
              
              return (
                <div
                  key={result.id}
                  onClick={() => setLocation(navUrl)}
                  className="bg-white rounded-lg p-4 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all active:scale-98"
                  data-testid={`mobile-search-result-${result.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.avatarUrl} />
                      <AvatarFallback className={`${badgeColor} text-white`}>
                        {displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{displayName}</p>
                        <Badge className={`${badgeColor} text-white text-xs shrink-0`}>
                          {result.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">@{result.username}</p>
                      {subtitle && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
                      )}
                      {result.role === 'Student' && result.skills && result.skills.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {result.skills.slice(0, 2).map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {result.skills.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{result.skills.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery.length >= 1 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No matches found</p>
            <p className="text-sm text-gray-400 mt-1">Try searching with different keywords</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
