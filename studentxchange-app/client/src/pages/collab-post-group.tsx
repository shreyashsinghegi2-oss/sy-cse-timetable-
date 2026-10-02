import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Users, Loader2, ImageIcon, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { storage, auth, collabFetch } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function CollabPostGroup() {
  const [, setLocation] = useLocation();
  const { user } = useCollabAuth();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [description, setDescription] = useState("");
  const [membersRequired, setMembersRequired] = useState(2);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const createPostMutation = useMutation({
    mutationFn: async (data: { groupName: string; groupDescription: string; description: string; membersRequired: number; mediaUrl?: string; mediaType?: string }) => {
      const response = await collabFetch('/api/collab/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'group',
          groupName: data.groupName,
          groupDescription: data.groupDescription,
          description: data.description,
          membersRequired: data.membersRequired,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Group post creation failed:', response.status, errorText);
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
      toast({ 
        title: "✅ Group post created successfully!",
        description: "Your post is now live on the feed",
        duration: 3000,
      });
      
      // Reset form
      setGroupName("");
      setGroupDescription("");
      setDescription("");
      setMembersRequired(2);
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
      
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
    if (!groupName.trim()) {
      toast({ 
        title: "Group name required", 
        description: "Please enter a name for your group",
        variant: "destructive" 
      });
      return;
    }

    if (!groupDescription.trim()) {
      toast({ 
        title: "Group description required", 
        description: "Please describe your group's purpose",
        variant: "destructive" 
      });
      return;
    }

    if (!description.trim()) {
      toast({ 
        title: "Requirements required", 
        description: "Please describe what you're looking for in members",
        variant: "destructive" 
      });
      return;
    }

    if (membersRequired < 2) {
      toast({ 
        title: "Invalid member count", 
        description: "At least 2 members are required for a group",
        variant: "destructive" 
      });
      return;
    }

    let mediaUrl: string | undefined;

    // Upload media to Firebase Storage if present
    if (mediaFile) {
      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          toast({ 
            title: "Authentication required", 
            description: "Please log out and log in again to upload media.",
            variant: "destructive" 
          });
          return;
        }
        
        // Create a unique filename with timestamp and user ID
        const timestamp = Date.now();
        const sanitizedFileName = mediaFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${firebaseUser.uid}/${timestamp}_${sanitizedFileName}`;
        const storageRef = ref(storage, `posts/${fileName}`);

        // Upload file to Firebase Storage
        await uploadBytes(storageRef, mediaFile);

        // Get download URL
        mediaUrl = await getDownloadURL(storageRef);
      } catch (error: any) {
        console.error('Upload error:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        
        let errorMessage = "Failed to upload media.";
        
        if (error?.code === 'storage/unauthorized') {
          errorMessage = "Upload not authorized. Please ensure you're logged in and Firebase Storage permissions are configured.";
        } else if (error?.code === 'storage/retry-limit-exceeded') {
          errorMessage = "Upload timeout. Please check your internet connection.";
        } else if (error?.message) {
          errorMessage = error.message;
        }
        
        toast({ 
          title: "Upload failed", 
          description: errorMessage,
          variant: "destructive" 
        });
        return;
      }
    }

    createPostMutation.mutate({
      groupName,
      groupDescription,
      description,
      membersRequired,
      mediaUrl,
      mediaType: mediaType || undefined,
    });
  };

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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Group Requirement Post</h1>
              <p className="text-sm text-gray-600">Find team members for your project or study group</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., React & Node.js Study Group"
                className="w-full"
                data-testid="input-group-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Brief description of your group's purpose and goals..."
                rows={3}
                className="w-full"
                data-testid="textarea-group-description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member Requirements <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Looking for students with React and Node.js experience, passionate about learning full-stack development..."
                rows={4}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many members do you need?
              </label>
              <Input
                type="number"
                min={2}
                max={20}
                value={membersRequired}
                onChange={(e) => setMembersRequired(parseInt(e.target.value))}
                className="w-full"
                data-testid="input-members-required"
              />
              <p className="text-xs text-gray-500 mt-1">
                A private group chat will be automatically created when all members have joined
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Students send join requests by clicking the "Join" button</li>
                <li>• You review requests and accept the members you want</li>
                <li>• Accepted members are added to your group instantly</li>
                <li>• When the group is full, a private group chat is automatically created</li>
                <li>• All members can communicate, share files, and collaborate in the group</li>
              </ul>
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
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-submit"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group Post"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
