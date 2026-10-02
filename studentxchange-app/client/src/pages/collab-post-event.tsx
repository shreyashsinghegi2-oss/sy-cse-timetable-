import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, X, Loader2, ArrowLeft, User, CalendarDays, Clock, Link as LinkIcon } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useCollabAuth } from "@/hooks/use-collab-auth";
import { useCollabProfile } from "@/hooks/use-collab-profile";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { collabFetch } from "@/lib/firebase";

export default function CollabPostEvent() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useCollabAuth();
  const { profile, isLoading: profileLoading } = useCollabProfile();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!authLoading && !profileLoading && !isAuthenticated) {
      setLocation('/student-collab');
    }
  }, [isAuthenticated, authLoading, profileLoading, setLocation]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLink, setEventLink] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);

  const createEventMutation = useMutation({
    mutationFn: async (data: { 
      type: string; 
      title: string;
      description: string; 
      eventDate: string;
      eventTime: string;
      eventLink?: string;
      mediaUrl?: string; 
      mediaType?: string 
    }) => {
      const response = await collabFetch('/api/collab/social/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Event creation failed:', response.status, errorText);
        let errorMessage = 'Failed to create event';
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
        title: "Event posted successfully!",
        description: "Your event is now live on the feed and Upcoming Events",
        duration: 3000,
      });
      
      setTitle("");
      setDescription("");
      setEventDate("");
      setEventTime("");
      setEventLink("");
      setMediaFile(null);
      setMediaPreview(null);
      setMediaType(null);
      
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collab/social/events'] });
      
      setTimeout(() => {
        setLocation('/student-collab');
      }, 1000);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create event", 
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
    if (profileLoading || !profile) {
      toast({ 
        title: "Profile required", 
        description: profileLoading ? "Please wait while we load your profile..." : "Please create your profile before posting.",
        variant: "destructive" 
      });
      return;
    }
    
    if (!title.trim()) {
      toast({ 
        title: "Event title required", 
        description: "Please enter a title for your event",
        variant: "destructive" 
      });
      return;
    }

    if (!description.trim()) {
      toast({ 
        title: "Description required", 
        description: "Please enter a description for your event",
        variant: "destructive" 
      });
      return;
    }

    if (!eventDate) {
      toast({ 
        title: "Event date required", 
        description: "Please select a date for your event",
        variant: "destructive" 
      });
      return;
    }

    if (!eventTime) {
      toast({ 
        title: "Event time required", 
        description: "Please select a time for your event",
        variant: "destructive" 
      });
      return;
    }

    let mediaUrl: string | undefined;

    if (mediaFile) {
      try {
        const formData = new FormData();
        formData.append('file', mediaFile);
        
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
        toast({ 
          title: "Upload failed", 
          description: error.message || "Failed to upload media.",
          variant: "destructive" 
        });
        return;
      }
    }

    createEventMutation.mutate({
      type: 'event',
      title,
      description,
      eventDate,
      eventTime,
      eventLink: eventLink || undefined,
      mediaUrl,
      mediaType: mediaType || undefined,
    });
  };

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
                You need to create your profile before you can post events.
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create Event Post</h1>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Web Development Workshop, Expert Session on AI..."
                className="w-full"
                data-testid="input-title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event, what attendees will learn, and any important details..."
                rows={4}
                className="w-full"
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarDays className="h-4 w-4 inline mr-1" />
                  Event Date *
                </label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full"
                  data-testid="input-date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Event Time *
                </label>
                <div className="flex gap-2">
                  <select
                    value={eventTime ? (parseInt(eventTime.split(':')[0]) > 12 ? (parseInt(eventTime.split(':')[0]) - 12).toString().padStart(2, '0') : (parseInt(eventTime.split(':')[0]) === 0 ? '12' : eventTime.split(':')[0])) : ''}
                    onChange={(e) => {
                      const hour = parseInt(e.target.value);
                      const currentMinute = eventTime ? eventTime.split(':')[1] : '00';
                      const isPM = eventTime ? parseInt(eventTime.split(':')[0]) >= 12 : false;
                      let hour24 = hour;
                      if (isPM && hour !== 12) hour24 = hour + 12;
                      if (!isPM && hour === 12) hour24 = 0;
                      setEventTime(`${hour24.toString().padStart(2, '0')}:${currentMinute}`);
                    }}
                    className="flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm min-w-0"
                    data-testid="input-time-hour"
                  >
                    <option value="">Hour</option>
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => (
                      <option key={h} value={h.toString().padStart(2, '0')}>{h}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-gray-500 font-medium">:</span>
                  <select
                    value={eventTime ? eventTime.split(':')[1] : ''}
                    onChange={(e) => {
                      const currentHour = eventTime ? eventTime.split(':')[0] : '12';
                      setEventTime(`${currentHour}:${e.target.value}`);
                    }}
                    className="flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm min-w-0"
                    data-testid="input-time-minute"
                  >
                    <option value="">Min</option>
                    {['00', '15', '30', '45'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={eventTime ? (parseInt(eventTime.split(':')[0]) >= 12 ? 'PM' : 'AM') : ''}
                    onChange={(e) => {
                      if (!eventTime) {
                        setEventTime(e.target.value === 'PM' ? '12:00' : '00:00');
                        return;
                      }
                      const currentHour = parseInt(eventTime.split(':')[0]);
                      const currentMinute = eventTime.split(':')[1];
                      let newHour = currentHour;
                      if (e.target.value === 'PM' && currentHour < 12) newHour = currentHour + 12;
                      if (e.target.value === 'AM' && currentHour >= 12) newHour = currentHour - 12;
                      setEventTime(`${newHour.toString().padStart(2, '0')}:${currentMinute}`);
                    }}
                    className="flex-1 h-10 px-2 rounded-md border border-input bg-background text-sm min-w-0"
                    data-testid="input-time-ampm"
                  >
                    <option value="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <LinkIcon className="h-4 w-4 inline mr-1" />
                Event Link (optional)
              </label>
              <Input
                type="url"
                value={eventLink}
                onChange={(e) => setEventLink(e.target.value)}
                placeholder="https://meet.google.com/... or https://zoom.us/..."
                className="w-full"
                data-testid="input-link"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Banner/Media (optional)
              </label>
              
              {!mediaPreview ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
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
                    <img src={mediaPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  ) : (
                    <video src={mediaPreview} className="w-full h-48 object-cover rounded-lg" controls />
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setLocation("/student-collab")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createEventMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-submit"
              >
                {createEventMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting Event...
                  </>
                ) : (
                  "Post Event"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
