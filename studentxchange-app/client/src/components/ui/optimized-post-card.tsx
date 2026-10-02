import { memo, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageSquare, Share2, Users, Calendar, Clock } from 'lucide-react';
import LazyImage from './lazy-image';

interface PostCardProps {
  post: {
    id: string;
    title?: string;
    description: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    type: 'direct' | 'group' | 'event' | 'arena';
    createdAt: string;
    eventDate?: string;
    eventTime?: string;
    membersRequired?: number;
    currentMembers?: number;
    skills?: string[];
    profile?: {
      fullName?: string;
      avatarUrl?: string;
      username?: string;
    };
  };
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onClick?: () => void;
}

function PostCardComponent({
  post,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false,
  onLike,
  onComment,
  onShare,
  onClick,
}: PostCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.();
  }, [onLike]);

  const handleCommentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onComment?.();
  }, [onComment]);

  const handleShareClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.();
  }, [onShare]);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeBadge = () => {
    switch (post.type) {
      case 'group':
        return <Badge className="bg-blue-100 text-blue-700">Group</Badge>;
      case 'event':
        return <Badge className="bg-purple-100 text-purple-700">Event</Badge>;
      case 'arena':
        return <Badge className="bg-amber-100 text-amber-700">Arena</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card 
      className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={post.profile?.avatarUrl} alt={post.profile?.fullName} />
            <AvatarFallback className="bg-blue-600 text-white text-sm">
              {getInitials(post.profile?.fullName)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">
                {post.profile?.fullName || 'Anonymous'}
              </span>
              {post.profile?.username && (
                <span className="text-gray-500 text-sm truncate">
                  @{post.profile.username}
                </span>
              )}
              <span className="text-gray-400 text-sm">
                {formatDate(post.createdAt)}
              </span>
              {getTypeBadge()}
            </div>
            
            {post.title && (
              <h3 className="font-semibold text-gray-900 mt-2">{post.title}</h3>
            )}
            
            <p className="text-gray-700 mt-1 whitespace-pre-wrap break-words">
              {post.description}
            </p>
            
            {post.type === 'event' && (post.eventDate || post.eventTime) && (
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {post.eventDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(post.eventDate).toLocaleDateString()}
                  </span>
                )}
                {post.eventTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {post.eventTime}
                  </span>
                )}
              </div>
            )}
            
            {post.type === 'group' && post.membersRequired && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{post.currentMembers || 1}/{post.membersRequired} members</span>
              </div>
            )}
            
            {post.skills && post.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.skills.slice(0, 5).map((skill, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {post.skills.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{post.skills.length - 5}
                  </Badge>
                )}
              </div>
            )}
            
            {post.mediaUrl && post.mediaType === 'image' && (
              <div className="mt-3 rounded-lg overflow-hidden aspect-video bg-gray-100">
                <LazyImage
                  src={post.mediaUrl}
                  alt="Post media"
                  className="w-full h-full object-cover"
                  containerClassName="w-full h-full"
                />
              </div>
            )}
            
            {post.mediaUrl && post.mediaType === 'video' && (
              <div className="mt-3 rounded-lg overflow-hidden aspect-video bg-gray-900">
                <video
                  src={post.mediaUrl}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 ${isLiked ? 'text-red-500' : 'text-gray-500'}`}
                onClick={handleLikeClick}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                {likesCount > 0 && <span>{likesCount}</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-500"
                onClick={handleCommentClick}
              >
                <MessageSquare className="h-4 w-4" />
                {commentsCount > 0 && <span>{commentsCount}</span>}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-500 ml-auto"
                onClick={handleShareClick}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const OptimizedPostCard = memo(PostCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.likesCount === nextProps.likesCount &&
    prevProps.commentsCount === nextProps.commentsCount &&
    prevProps.isLiked === nextProps.isLiked
  );
});
