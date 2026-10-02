import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuyerRequest } from "@shared/schema";

interface BuyerRequestWithUser extends BuyerRequest {
  requester?: {
    id: number;
    username: string;
    email: string;
    phone: string;
  };
}

export default function BuyerRequestsManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["/api/admin/buyer-requests"],
    queryFn: async (): Promise<BuyerRequestWithUser[]> => {
      const response = await fetch("/api/admin/buyer-requests");
      if (!response.ok) {
        const fallbackResponse = await fetch("/api/buyer-requests");
        if (!fallbackResponse.ok) {
          throw new Error("Failed to fetch buyer requests");
        }
        return fallbackResponse.json();
      }
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      const response = await fetch(`/api/buyer-requests/${requestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update request status");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Buyer request status has been updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/buyer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer-requests"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update request status", variant: "destructive" });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/admin/buyer-requests/${requestId}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request Deleted", description: "Buyer request has been removed successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/buyer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buyer-requests"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete request", variant: "destructive" });
    },
  });

  const filteredRequests = requests.filter((request) => {
    const matchesSearch = !searchTerm ||
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':      return 'bg-green-100 text-green-800';
      case 'fulfilled': return 'bg-blue-100 text-blue-800';
      case 'closed':    return 'bg-gray-100 text-gray-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequesterInfo = (requesterId: number) => users.find((u: any) => u.id === requesterId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buyer Requests Management</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buyer Requests Management</CardTitle>
        <CardDescription>
          View, manage and remove buyer requests posted on the marketplace
        </CardDescription>
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request Details</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => {
              const requester = getRequesterInfo(request.requesterUserId);
              return (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{request.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{request.description}</div>
                      <div className="text-xs text-gray-400">ID: {request.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-start space-x-2">
                      <User className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-medium text-sm text-blue-900">
                          {requester?.username || 'Unknown User'}
                        </div>
                        <div className="text-xs text-blue-700">📧 {requester?.email || 'No email'}</div>
                        <div className="text-xs text-blue-700">📱 {requester?.phone || 'No phone'}</div>
                        <div className="text-xs text-blue-600">🆔 User ID: {request.requesterUserId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.priceRange ? (
                      <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                        {request.priceRange}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={request.status}
                        onValueChange={(status) => updateStatusMutation.mutate({ requestId: request.id, status })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="fulfilled">Fulfilled</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleteRequestMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Buyer Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently remove the request <strong>"{request.title}"</strong> posted by{" "}
                              {requester?.username || `User #${request.requesterUserId}`}?
                              This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => deleteRequestMutation.mutate(request.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                    <div className="text-gray-500">
                      {searchTerm || statusFilter !== "all"
                        ? "No buyer requests match your filters"
                        : "No buyer requests found"}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
