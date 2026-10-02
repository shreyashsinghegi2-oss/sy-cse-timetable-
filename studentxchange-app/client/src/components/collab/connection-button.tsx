import { Button } from "@/components/ui/button";
import { UserPlus, Check, Clock, Users, MessageCircle } from "lucide-react";
import { useConnectionStatus, useSendConnectionRequest } from "@/hooks/use-connections";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ConnectionButtonProps {
  targetUid: string;
  targetUserId?: string;
  targetName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showMessage?: boolean;
}

export function ConnectionButton({ 
  targetUid,
  targetUserId, 
  targetName,
  variant = "default",
  size = "default",
  className = "",
  showMessage = true
}: ConnectionButtonProps) {
  const { user } = useCollabAuth();
  const [, setLocation] = useLocation();
  const { status, isLoading } = useConnectionStatus(targetUid);
  const sendRequest = useSendConnectionRequest();
  const { toast } = useToast();
  const [optimisticState, setOptimisticState] = useState<string | null>(null);


  if (!user || user.uid === targetUid) {
    return null;
  }

  const handleConnect = async () => {
    if (status === 'none') {
      setOptimisticState('pending_sent');
      
      try {
        await sendRequest.mutateAsync(targetUid);
      } catch (error) {
        setOptimisticState(null);
      }
    }
  };

  const handleMessage = () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "Please log in to send messages",
        variant: "destructive"
      });
      return;
    }
    
    // Generate chat ID
    const sortedIds = [user.uid, targetUid].sort();
    const chatId = `${sortedIds[0]}_${sortedIds[1]}`;
    
    // Navigate directly to the chat page - it will handle creation
    setLocation(`/collab-messages/${chatId}`);
  };

  const currentStatus = optimisticState || status;

  if (currentStatus === 'connected') {
    return (
      <div className="flex items-center gap-2 animate-in fade-in duration-200">
        <Button
          size={size}
          disabled
          className={`${className} bg-green-600 text-white rounded-lg px-4 py-2 transition-all duration-300 cursor-not-allowed opacity-90`}
          data-testid="connection-button-connected"
        >
          <Check className="h-4 w-4 mr-2 animate-in scale-in duration-200" />
          Connected
        </Button>
        {showMessage && (
          <Button
            onClick={handleMessage}
            className="bg-white hover:bg-gray-50 text-blue-600 font-medium rounded-lg px-4 py-2 border border-blue-600 transition-all duration-200 hover:scale-105 active:scale-95"
            data-testid={`button-message-${targetUserId}`}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Message
          </Button>
        )}
      </div>
    );
  }

  if (currentStatus === 'pending_sent') {
    return (
      <div className="flex items-center gap-2 animate-in fade-in duration-200">
        <Button
          size={size}
          disabled
          className={`${className} bg-gray-200 text-gray-600 rounded-lg px-4 py-2 transition-all duration-300 cursor-not-allowed`}
          data-testid="connection-button-requested"
        >
          <Clock className="h-4 w-4 mr-2 animate-in scale-in duration-200" />
          Request Sent
        </Button>
      </div>
    );
  }

  if (currentStatus === 'pending_received') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size={size}
          disabled
          className={`${className} bg-blue-100 text-blue-700 rounded-lg px-4 py-2`}
          data-testid="connection-button-pending-received"
        >
          <Users className="h-4 w-4 mr-2" />
          Respond in Notifications
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size={size}
        onClick={handleConnect}
        disabled={sendRequest.isPending}
        className={`${className} bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 transition-all duration-200 hover:scale-105 active:scale-95`}
        data-testid="connection-button-connect"
      >
        <UserPlus className="h-4 w-4 mr-2 transition-transform duration-200" />
        Connect
      </Button>
    </div>
  );
}
