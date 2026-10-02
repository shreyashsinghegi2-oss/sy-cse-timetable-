import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  X,
  UserPlus,
  MessageCircle,
  Clock,
  Circle
} from "lucide-react";

// Mock conversation data
const mockConversations = [
  {
    id: 1,
    user: {
      id: 2,
      username: "Sarah Johnson",
      avatarUrl: "",
      college: "Stanford University",
      isOnline: true
    },
    lastMessage: {
      content: "Hey! Are you still working on the ML project?",
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      senderId: 2
    },
    unread: 2
  },
  {
    id: 2,
    user: {
      id: 3,
      username: "Mike Chen",
      avatarUrl: "",
      college: "MIT",
      isOnline: false
    },
    lastMessage: {
      content: "Thanks for the help with the algorithm!",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      senderId: 3
    },
    unread: 0
  },
  {
    id: 3,
    user: {
      id: 4,
      username: "Emma Wilson",
      avatarUrl: "",
      college: "Harvard University", 
      isOnline: true
    },
    lastMessage: {
      content: "Can we schedule a study session for tomorrow?",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      senderId: 4
    },
    unread: 1
  }
];

const mockMessages = [
  {
    id: 1,
    senderId: 2,
    content: "Hey! Are you still working on the ML project?",
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    type: "text"
  },
  {
    id: 2,
    senderId: 1, // Current user
    content: "Yes! I'm just finishing up the neural network implementation.",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    type: "text"
  },
  {
    id: 3,
    senderId: 2,
    content: "That's great! Do you need any help with the training data?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    type: "text"
  },
  {
    id: 4,
    senderId: 1,
    content: "Actually, yes! I'm having trouble with data preprocessing. Could you take a look?",
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    type: "text"
  }
];

export function ChatPanel() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [conversations, setConversations] = useState(mockConversations);
  // Store messages per conversation: Record<conversationId, messages[]>
  const [messagesByConversation, setMessagesByConversation] = useState<Record<number, typeof mockMessages>>({
    1: mockMessages.filter(msg => [1, 2].includes(msg.senderId)), // Sarah Johnson conversation
    2: [], // Mike Chen - empty for demo
    3: []  // Emma Wilson - empty for demo
  });
  // Track typing indicator per conversation
  const [isTypingByConv, setIsTypingByConv] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesByConversation, selectedConversation]);

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      const currentUserId = 1; // Current user ID
      const currentMessages = messagesByConversation[selectedConversation] || [];
      const newMsg = {
        id: Date.now(), // Use timestamp for unique ID
        senderId: currentUserId,
        content: newMessage.trim(),
        timestamp: new Date(),
        type: "text" as const
      };
      
      // Add new message to the specific conversation
      setMessagesByConversation(prev => ({
        ...prev,
        [selectedConversation]: [...currentMessages, newMsg]
      }));
      
      // Update conversation's last message and reorder conversations by activity
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === selectedConversation 
            ? { ...conv, lastMessage: { content: newMessage.trim(), timestamp: newMsg.timestamp, senderId: currentUserId } }
            : conv
        );
        // Sort by latest activity (most recent first)
        return updated.sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime());
      });
      
      setNewMessage("");
      
      // Simulate real-time response from other user - pass conversation ID to avoid race conditions
      const conversationId = selectedConversation;
      setTimeout(() => {
        simulateResponse(conversationId);
      }, 1000 + Math.random() * 3000); // Random delay 1-4 seconds
    }
  };

  const simulateResponse = (conversationId: number) => {
    const responses = [
      "That sounds great!",
      "I agree with you on that.",
      "Let me think about it.",
      "Good point! 👍",
      "Thanks for sharing that.",
      "Interesting perspective.",
      "I'll get back to you on this.",
      "Count me in!",
      "That makes sense.",
      "Cool, let's do it!"
    ];
    
    const currentConv = conversations.find(c => c.id === conversationId);
    if (!currentConv) return;
    
    // Set typing indicator for this specific conversation
    setIsTypingByConv(prev => ({ ...prev, [conversationId]: true }));
    
    setTimeout(() => {
      const currentMessages = messagesByConversation[conversationId] || [];
      const responseMsg = {
        id: Date.now() + Math.random(), // Unique ID
        senderId: currentConv.user.id,
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        type: "text" as const
      };
      
      // Add response to the specific conversation
      setMessagesByConversation(prev => ({
        ...prev,
        [conversationId]: [...currentMessages, responseMsg]
      }));
      
      // Update conversation's last message, unread count, and reorder conversations
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === conversationId) {
            // If this conversation is currently selected, don't increment unread
            // If it's in the background, increment unread count
            const unreadIncrement = selectedConversation === conversationId ? 0 : 1;
            return { 
              ...conv, 
              lastMessage: { content: responseMsg.content, timestamp: responseMsg.timestamp, senderId: responseMsg.senderId },
              unread: conv.unread + unreadIncrement
            };
          }
          return conv;
        });
        // Sort by latest activity (most recent first)
        return updated.sort((a, b) => b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime());
      });
      
      // Clear typing indicator for this conversation
      setIsTypingByConv(prev => ({ ...prev, [conversationId]: false }));
    }, 1500); // Typing simulation delay
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.college.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConversation = conversations.find(conv => conv.id === selectedConversation);
  const totalUnread = conversations.reduce((acc, conv) => acc + conv.unread, 0);
  const currentMessages = selectedConversation ? messagesByConversation[selectedConversation] || [] : [];

  // Function to handle opening a conversation and clearing unread count
  const handleOpenConversation = (conversationId: number) => {
    setSelectedConversation(conversationId);
    // Clear unread count for the opened conversation
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId ? { ...conv, unread: 0 } : conv
    ));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return `${diffDays}d`;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white text-xs">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          {selectedConversation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedConversation(null)}
              data-testid="button-back-to-conversations"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {!selectedConversation ? (
          // Conversations List
          <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleOpenConversation(conversation.id)}
                      data-testid={`conversation-${conversation.id}`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conversation.user.avatarUrl} />
                          <AvatarFallback className="bg-blue-600 text-white text-sm">
                            {conversation.user.username.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.user.isOnline && (
                          <Circle className="absolute -bottom-1 -right-1 h-3 w-3 fill-green-500 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {conversation.user.username}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessage.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {conversation.lastMessage.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {conversation.user.college}
                        </p>
                      </div>
                      {conversation.unread > 0 && (
                        <Badge className="bg-blue-600 text-white text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                          {conversation.unread}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No conversations found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Chat View
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            {currentConversation && (
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentConversation.user.avatarUrl} />
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {currentConversation.user.username.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {currentConversation.user.isOnline && (
                        <Circle className="absolute -bottom-1 -right-1 h-2 w-2 fill-green-500 text-green-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {currentConversation.user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {currentConversation.user.isOnline ? 'Active now' : 'Last seen 2h ago'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === 1 ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-3 py-2 rounded-lg ${
                        message.senderId === 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === 1 ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator - Show only for current conversation */}
                {selectedConversation && isTypingByConv[selectedConversation] && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg max-w-[70%]">
                      <div className="flex items-center space-x-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="pr-8"
                    data-testid="input-new-message"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mobile Chat Sheet Component
export function MobileChatSheet({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(90vh-80px)]">
          <ChatPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}