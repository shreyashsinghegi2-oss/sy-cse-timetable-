import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, X, Loader2, ArrowLeft, User } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useCollabProfile } from "@/hooks/use-collab-profile";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { collabFetch } from "@/lib/firebase";

export default function CollabPostDirect() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useCollabAuth();
  const { profile, isLoading: profileLoading } = useCollabProfile();
  const { toast } = useToast();
  
  // Redirect to login if not authenticated - but wait for auth to finish loading first
  useEffect(() => {
    if (!authLoading && !profileLoading && !isAuthenticated) {
      setLocation('/student-collab');
    }
  }, [isAuthenticated, authLoading, profileLoading, setLocation]);

  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const createPostMutation = useMutation({
    mutationFn: async (data: { type: string; description: string; mediaUrl?: string; mediaType?: string }) => {
      const response = await collabFetch('/api/collab/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Post creation failed:', response.status, errorText);
        let errorMessage = 'Failed to create post';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      // Show success message
      toast({ 
        title: "✅ Post uploaded successfully!",
        description: "Your post is now live on the feed",
        duration: 3000,
      });
      
      // Reset form immediately
      setDescription("");
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
      
      // Navigate back to feed after showing success
      setTimeout(() => {
        setLocation('/student-collab');
      }, 1000);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create post", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setMediaType("image");
    } else if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload an image or video",
        variant: "destructive" 
      });
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handleSubmit = async () => {
    // Block posting if profile is loading or doesn't exist
    if (profileLoading || !profile) {
      toast({ 
        title: "Profile required", 
        description: profileLoading ? "Please wait while we load your profile..." : "Please create your profile before posting.",
        variant: "destructive" 
      });
      return;
    }
    
    if (!description.trim()) {
      toast({ 
        title: "Description required", 
        description: "Please enter a description for your post",
        variant: "destructive" 
      });
      return;
    }

    let mediaUrl: string | undefined;

    // Upload media to Firebase Storage via server-side upload
    if (mediaFile) {
      try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', mediaFile);
        
        // Upload to server which will upload to Firebase Storage using Admin SDK
        const uploadResponse = await collabFetch('/api/collab/social/upload-media', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.message || error.error || 'Upload failed');
        }

        const { mediaUrl: uploadedUrl } = await uploadResponse.json();
        mediaUrl = uploadedUrl;
      } catch (error: any) {
        console.error('Upload error:', error);
        
        toast({ 
          title: "Upload failed", 
          description: error.message || "Failed to upload media. You can try posting without media.",
          variant: "destructive" 
        });
        return;
      }
    }

    createPostMutation.mutate({
      type: 'direct',
      description,
      mediaUrl,
      mediaType: mediaType || undefined,
    });
  };

  // Show loading while auth or profile is loading
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show profile required message if no profile
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => setLocation("/student-collab")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Student Collab
            </Button>
          </div>
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Profile Required</h2>
              <p className="text-gray-600 mb-4">
                You need to create your profile before you can post.
              </p>
              <Button asChild data-testid="button-build-profile">
                <Link href="/collab-org-selector">Build Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/student-collab")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student Collab
          </Button>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Direct Post</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's on your mind?
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share your thoughts, updates, or experiences..."
                rows={6}
                className="w-full"
                data-testid="textarea-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add media (optional)
              </label>
              
              {!mediaPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload image or video</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    data-testid="input-media"
                  />
                </label>
              ) : (
                <div className="relative">
                  {mediaType === "image" ? (
                    <img src={mediaPreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                  ) : (
                    <video src={mediaPreview} className="w-full h-64 object-cover rounded-lg" controls />
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveMedia}
                    data-testid="button-remove-media"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/student-collab")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createPostMutation.isPending}
                data-testid="button-submit"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
