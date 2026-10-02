import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, CheckCircle, XCircle, Clock, Eye, Loader2,
  Trophy, Users, CreditCard, Image, Trash2
} from "lucide-react";

interface ArenaRegistration {
  id: string;
  uid: string;
  fullName: string;
  email: string;
  mobile: string;
  college: string;
  courseYear: string;
  category: string;
  projectTitle: string;
  transactionId: string;
  paymentScreenshotUrl: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
  verifiedAt?: string;
}

export default function CollabArenaAdmin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useCollabAuth();
  const { toast } = useToast();
  const [selectedRegistration, setSelectedRegistration] = useState<ArenaRegistration | null>(null);
  const [showScreenshot, setShowScreenshot] = useState(false);

  const { data: registrations = [], isLoading } = useQuery<ArenaRegistration[]>({
    queryKey: ['/api/collab/social/arena/admin/registrations'],
    queryFn: async () => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch('/api/collab/social/arena/admin/registrations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 403) throw new Error('Admin access required');
        throw new Error('Failed to fetch registrations');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'confirmed' | 'rejected' }) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/arena/admin/registrations/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to verify registration');
      return response.json();
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/arena/admin/registrations'] });
      toast({
        title: status === 'confirmed' ? "Payment Confirmed" : "Registration Rejected",
        description: status === 'confirmed' 
          ? "User will now have access to Collab Arena" 
          : "User has been notified",
      });
      setSelectedRegistration(null);
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('collabAuthToken');
      const response = await fetch(`/api/collab/social/arena/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete registration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/arena/admin/registrations'] });
      toast({
        title: "Registration Deleted",
        description: "Registration and associated posts have been removed",
      });
      setSelectedRegistration(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'creative': return '🎨 Creative House';
      case 'idea': return '💡 Idea Innovation';
      case 'tech': return '💻 House of Tech';
      default: return cat;
    }
  };

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const rejectedCount = registrations.filter(r => r.status === 'rejected').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Please sign in to access admin panel</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button 
          onClick={() => setLocation('/collab-arena')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          data-testid="button-back-to-arena"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Collab Arena
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-blue-600" />
            Arena Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage registrations and verify payments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-yellow-50">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-yellow-700">{pendingCount}</p>
              <p className="text-yellow-600">Pending Verification</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-700">{confirmedCount}</p>
              <p className="text-green-600">Confirmed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-red-50">
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-700">{rejectedCount}</p>
              <p className="text-red-600">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : registrations.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No registrations yet</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-4 font-semibold text-gray-700">Participant</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Project</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Transaction ID</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {registrations.map((reg) => (
                    <tr 
                      key={reg.id} 
                      className="hover:bg-gray-50"
                      data-testid={`registration-row-${reg.id}`}
                    >
                      <td className="p-4">
                        <p className="font-medium text-gray-900">{reg.fullName}</p>
                        <p className="text-sm text-gray-500">{reg.email}</p>
                        <p className="text-xs text-gray-400">{reg.college}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-gray-900">{reg.projectTitle}</p>
                        <p className="text-sm text-gray-500">{getCategoryLabel(reg.category)}</p>
                      </td>
                      <td className="p-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{reg.transactionId}</code>
                      </td>
                      <td className="p-4">
                        <Badge 
                          className={
                            reg.status === 'confirmed' 
                              ? 'bg-green-100 text-green-700' 
                              : reg.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {reg.status === 'confirmed' ? '✅ Confirmed' : reg.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRegistration(reg);
                              setShowScreenshot(true);
                            }}
                            data-testid={`view-screenshot-${reg.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {reg.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => verifyMutation.mutate({ id: reg.id, status: 'confirmed' })}
                                disabled={verifyMutation.isPending}
                                data-testid={`confirm-${reg.id}`}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => verifyMutation.mutate({ id: reg.id, status: 'rejected' })}
                                disabled={verifyMutation.isPending}
                                data-testid={`reject-${reg.id}`}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Delete registration for ${reg.fullName}? This will also remove their arena posts.`)) {
                                deleteMutation.mutate(reg.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`delete-${reg.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={showScreenshot} onOpenChange={setShowScreenshot}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Participant</p>
                  <p className="font-medium">{selectedRegistration.fullName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Transaction ID</p>
                  <p className="font-mono">{selectedRegistration.transactionId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mobile</p>
                  <p className="font-medium">{selectedRegistration.mobile || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Project</p>
                  <p className="font-medium">{selectedRegistration.projectTitle}</p>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden" style={{ aspectRatio: '4/3', minHeight: '200px' }}>
                <img 
                  src={selectedRegistration.paymentScreenshotUrl} 
                  alt="Payment screenshot" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedRegistration?.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    verifyMutation.mutate({ id: selectedRegistration.id, status: 'rejected' });
                    setShowScreenshot(false);
                  }}
                  disabled={verifyMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => {
                    verifyMutation.mutate({ id: selectedRegistration.id, status: 'confirmed' });
                    setShowScreenshot(false);
                  }}
                  disabled={verifyMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
