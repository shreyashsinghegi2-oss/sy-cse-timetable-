import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ShoppingBag, ArrowRight, User } from "lucide-react";
import { PLATFORM_ADMIN_EMAIL } from "@/config/constants";
import { Link } from "wouter";
import BuyerRequestModal from "@/components/buyer-request/buyer-request-modal";
import { BuyerRequest } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function BuyerRequestsPage() {
  const { user } = useAuth();
  
  const isAdmin = user && (user.email === PLATFORM_ADMIN_EMAIL || user.username === "admin");
  
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/buyer-requests"],
    queryFn: async (): Promise<BuyerRequest[]> => {
      const response = await fetch("/api/buyer-requests");
      if (!response.ok) {
        throw new Error("Failed to fetch buyer requests");
      }
      return response.json();
    },
  });
  
  // Fetch user data for admin view only
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
    enabled: !!isAdmin, // Only fetch when user is admin (convert to boolean)
  });
  
  // Helper function to get requester info (admin only)
  const getRequesterInfo = (requesterId: number) => {
    if (!isAdmin) return null; // Hide details for non-admin users
    return users.find((u: any) => u.id === requesterId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Buyer Requests</h1>
          <BuyerRequestModal />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Buyer Requests</h1>
          <p className="text-gray-600 mt-1">
            Browse what students are looking for and list matching items
          </p>
        </div>
        <BuyerRequestModal />
      </div>

      {/* Info Banner */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShoppingBag className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Have what someone needs?</p>
              <p className="text-blue-700 text-sm mt-1">
                If you have any of these items, please list them in our Sell section instead of responding here.
              </p>
              <Link href="/sell">
                <Button size="sm" variant="outline" className="mt-2 text-blue-700 border-blue-300 hover:bg-blue-100">
                  Go to Sell Section <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Grid */}
      {requests && requests.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{request.title}</CardTitle>
                  <Badge variant={request.status === 'open' ? 'default' : request.status === 'fulfilled' ? 'secondary' : 'outline'}>
                    {request.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4 line-clamp-3">{request.description}</p>
                
                {/* Requester Details - Admin Only */}
                {isAdmin && (() => {
                  const requester = getRequesterInfo(request.requesterUserId);
                  return (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <User className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-blue-900">
                            Requester: {requester?.username || 'Unknown User'}
                          </div>
                          <div className="text-xs text-blue-700">
                            {requester?.email || 'No email'}
                          </div>
                          <div className="text-xs text-blue-700">
                            {requester?.phone || 'No phone'}
                          </div>
                          <div className="text-xs text-blue-600">
                            User ID: {request.requesterUserId}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {request.priceRange && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                      Budget: {request.priceRange}
                    </span>
                  </div>
                )}
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  If you have this item, please list it in the Sell section.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No buyer requests yet</h3>
          <p className="text-gray-600 mb-4">Be the first to post what you're looking for!</p>
          <BuyerRequestModal />
        </Card>
      )}

      {/* Bottom CTA */}
      <Card className="mt-8 bg-gray-50">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">Looking for something specific?</h3>
          <p className="text-gray-600 mb-4">
            Post your buyer request and let sellers know what you need
          </p>
          <BuyerRequestModal />
        </CardContent>
      </Card>
    </div>
  );
}