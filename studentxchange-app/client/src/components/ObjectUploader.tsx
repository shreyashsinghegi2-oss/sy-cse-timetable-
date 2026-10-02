import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Image, Loader2 } from "lucide-react";
import { isHeicFile, convertHeicToJpeg } from "@/lib/image-compression";
// browser-image-compression is dynamically imported inside handleFileSelect — NOT in initial bundle
import { getAuthToken } from "@/lib/firebase";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  accept?: string;
  onGetUploadParameters?: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { url: string }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A simplified file upload component for profile pictures
 * Supports HEIC conversion for iPhone photos and image compression
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  accept = "image/*,.heic,.heif",
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      alert(`File size must be less than ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    
    try {
      let processableFile = file;
      
      // Convert HEIC to JPEG for iPhone photos
      if (isHeicFile(file)) {
        processableFile = await convertHeicToJpeg(file);
      }
      
      // Compress image for faster upload (max 1MB, max 1200px)
      // browser-image-compression is dynamically imported here — only loaded when user selects a file
      if (processableFile.type.startsWith('image/')) {
        const { default: imageCompression } = await import('browser-image-compression');
        const compressed = await imageCompression(processableFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          initialQuality: 0.9,
        });
        processableFile = new File([compressed], processableFile.name, { type: compressed.type });
      }
      
      setProcessedFile(processableFile);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(processableFile);
    } catch (error) {
      console.error('Error processing image:', error);
      alert(error instanceof Error ? error.message : 'Failed to process image. Please try a different file.');
      setSelectedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    const fileToUpload = processedFile || selectedFile;
    if (!fileToUpload) return;

    try {
      setIsUploading(true);
      
      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Get JWT token using proper auth function (handles refresh if needed)
      const token = await getAuthToken();
      
      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }
      
      // Upload file through backend proxy
      const response = await fetch('/api/collab/profile-picture-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        
        // If auth error, try refreshing token and retry once
        if (response.status === 401 || response.status === 403) {
          const { refreshAuthToken } = await import('@/lib/firebase');
          const freshToken = await refreshAuthToken();
          
          if (freshToken) {
            const retryResponse = await fetch('/api/collab/profile-picture-upload', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${freshToken}`,
              },
              body: formData,
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              onComplete?.({ url: retryData.url });
              setSelectedFile(null);
              setProcessedFile(null);
              setPreviewUrl(null);
              return;
            }
          }
          
          throw new Error('Session expired. Please log in again.');
        }
        
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onComplete?.({ url: data.url });
      
      // Clear state after successful upload
      setSelectedFile(null);
      setProcessedFile(null);
      setPreviewUrl(null);
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setProcessedFile(null);
    setPreviewUrl(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || isProcessing}
        />
        <div onClick={handleButtonClick} className="inline-block cursor-pointer">
          {children}
        </div>
        
        {isProcessing && (
          <Badge variant="secondary" className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing...
          </Badge>
        )}
        
        {selectedFile && !isProcessing && (
          <Badge variant="secondary" className="flex items-center gap-2">
            <Image className="h-3 w-3" />
            {selectedFile.name.length > 20 
              ? selectedFile.name.substring(0, 17) + '...' 
              : selectedFile.name}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-1 hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
      </div>

      {previewUrl && !isProcessing && (
        <div className="space-y-3">
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-24 h-24 object-cover rounded-lg border"
          />
          <Button 
            onClick={handleUpload} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Profile Picture'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}