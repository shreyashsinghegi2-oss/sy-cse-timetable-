import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Send, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

interface Connection {
  id: string;
  senderId: number;
  senderUid: string;
  receiverId: number;
  receiverUid: string;
  status: string;
}

export function ShareModal({ open, onOpenChange, postId }: ShareModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnections, setSelectedConnections] = useState<Set<string>>(new Set());

  // Fetch user's connections
  const { data: connections = [], isLoading } = useQuery<Connection[]>({
    queryKey: ['/api/collab/social/connections'],
    enabled: open,
  });

  // Get current user's UID from auth
  const token = localStorage.getItem('collabAuthToken');
  let currentUserUid: string | null = null;
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserUid = payload.uid;
    } catch (e) {
      console.error('Failed to parse token:', e);
    }
  }

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('collabAuthToken');
      if (!token || !currentUserUid) throw new Error('Not authenticated');

      const promises = Array.from(selectedConnections).map(async (counterpartUid) => {
        const connection = connections.find(c => 
          (c.senderUid === currentUserUid && c.receiverUid === counterpartUid) ||
          (c.receiverUid === currentUserUid && c.senderUid === counterpartUid)
        );
        
        if (!connection) throw new Error('Connection not found');

        // Determine receiver (the counterpart, not current user)
        const receiverUid = connection.senderUid === currentUserUid ? connection.receiverUid : connection.senderUid;
        const receiverId = connection.senderId === currentUserUid ? connection.receiverId : connection.senderId;

        const response = await fetch(`/api/collab/social/posts/${postId}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ receiverId, receiverUid }),
        });

        if (!response.ok) {
          throw new Error('Failed to share post');
        }
        
        return response.json();
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: `Post shared with ${selectedConnections.size} ${selectedConnections.size === 1 ? 'connection' : 'connections'}!` });
      setSelectedConnections(new Set());
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to share post", variant: "destructive" });
    },
  });

  // Get counterpart UID for each connection
  const getCounterpartUid = (conn: Connection) => {
    if (!currentUserUid) return '';
    return conn.senderUid === currentUserUid ? conn.receiverUid : conn.senderUid;
  };

  const filteredConnections = connections
    .map(conn => ({
      ...conn,
      counterpartUid: getCounterpartUid(conn),
    }))
    .filter(conn => 
      conn.counterpartUid.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const toggleConnection = (uid: string) => {
    const newSelected = new Set(selectedConnections);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedConnections(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-connections"
            />
          </div>

          {/* Connections List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredConnections.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchQuery ? "No connections found" : "No connections yet"}
              </p>
            ) : (
              filteredConnections.map((connection) => {
                const uid = connection.counterpartUid;
                const isSelected = selectedConnections.has(uid);
                
                return (
                  <button
                    key={connection.id}
                    onClick={() => toggleConnection(uid)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    data-testid={`connection-${uid}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-600 text-white">
                        {uid.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{uid}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedConnections(new Set());
                onOpenChange(false);
              }}
              data-testid="button-cancel-share"
            >
              Cancel
            </Button>
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={selectedConnections.size === 0 || shareMutation.isPending}
              data-testid="button-confirm-share"
            >
              {shareMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share ({selectedConnections.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
