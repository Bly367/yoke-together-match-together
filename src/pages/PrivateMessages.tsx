import { useMemo, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { 
  usePrivateConversations, 
  usePrivateConversationsSubscription,
  useTotalUnreadPrivateCount
} from "@/hooks/usePrivateMessaging";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PrivateConversationItem } from "@/components/PrivateConversationItem";

/**
 * Private Messages Page - Conversation List
 * 
 * Displays all private conversations, sorted by most recent activity.
 * Optimized for messaging with real-time updates.
 */
const PrivateMessages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    data: conversations, 
    isLoading: conversationsLoading, 
    isError: conversationsError 
  } = usePrivateConversations(user?.id || null);
  
  // Subscribe to conversation updates
  usePrivateConversationsSubscription(user?.id || null, !!user?.id);
  
  // Get total unread count for badge
  const totalUnread = useTotalUnreadPrivateCount(user?.id || null);
  
  const conversationsListRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Sort and filter conversations by last message time (most recent first)
  const sortedConversations = useMemo(() => {
    if (!conversations || !Array.isArray(conversations)) return [];
    
    let filtered = [...conversations];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((conversation) => {
        try {
          const otherUser = 
            conversation.user1_id === user?.id 
              ? conversation.user2 
              : conversation.user1;
          
          if (!otherUser) return false;
          
          const userName = otherUser.name?.toLowerCase() || '';
          const lastMessage = conversation.last_message;
          const messageContent = lastMessage?.content?.toLowerCase() || '';
          
          return userName.includes(query) || messageContent.includes(query);
        } catch (error) {
          logger.error('Error filtering conversation', error);
          return false;
        }
      });
    }
    
    // Sort by last message time (most recent first)
    return filtered.sort((a, b) => {
      try {
        const aLastMessage = a.last_message;
        const bLastMessage = b.last_message;
        
        // If both have messages, sort by message time
        if (aLastMessage && bLastMessage) {
          return new Date(bLastMessage.created_at).getTime() - new Date(aLastMessage.created_at).getTime();
        }
        
        // If only one has a message, prioritize it
        if (aLastMessage && !bLastMessage) return -1;
        if (!aLastMessage && bLastMessage) return 1;
        
        // If neither has messages, sort by conversation creation time
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } catch (error) {
        logger.error('Error sorting conversations', error);
        return 0;
      }
    });
  }, [conversations, searchQuery, user?.id]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (conversationsListRef.current) {
        const rect = conversationsListRef.current.getBoundingClientRect();
        setContainerHeight(window.innerHeight - rect.top - 100); // Account for header and bottom nav
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  if (conversationsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (conversationsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading conversations</p>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-2xl font-bold text-foreground">Private Messages</h1>
            {totalUnread > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold rounded-full px-2 py-1">
                {totalUnread}
              </span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div ref={conversationsListRef} className="max-w-4xl mx-auto px-4 py-4">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery ? 'No conversations found' : 'No private messages yet'}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {searchQuery 
                ? 'Try adjusting your search terms.'
                : 'Start a private conversation with someone you\'ve matched with!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedConversations.map((conversation) => {
              if (!user?.id) return null;
              
              return (
                <PrivateConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  currentUserId={user.id}
                  onClick={() => navigate(ROUTES.PRIVATE_CHAT(conversation.id))}
                />
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PrivateMessages;

