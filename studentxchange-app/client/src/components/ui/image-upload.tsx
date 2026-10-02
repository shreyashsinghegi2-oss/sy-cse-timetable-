import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { X, Upload, Image, Loader2, Eye } from 'lucide-react';
import { processMultipleImages } from '@/lib/image-compression';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadResult {
  thumbnailUrl: string;
  fullImageUrl: string;
}

interface ImageUploadProps {
  value?: ImageUploadResult[];
  onChange?: (images: ImageUploadResult[]) => void;
  maxImages?: number;
  disabled?: boolean;
  className?: string;
}

export default function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  disabled = false,
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = async (files: FileList) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: 'Invalid files',
        description: 'Please select valid image files',
        variant: 'destructive',
      });
      return;
    }

    const totalSlots = maxImages - value.length;
    if (imageFiles.length > totalSlots) {
      toast({
        title: 'Too many images',
        description: `You can only upload ${totalSlots} more image(s)`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const results = await processMultipleImages(imageFiles, (completed, total) => {
        setProgress((completed / total) * 100);
      });

      onChange?.([...value, ...results]);
      
      toast({
        title: 'Upload successful',
        description: `${imageFiles.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const newImages = value.filter((_, i) => i !== index);
    onChange?.(newImages);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const canUploadMore = value.length < maxImages && !disabled;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {canUploadMore && (
        <Card>
          <CardContent className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Processing images...</p>
                    <Progress value={progress} className="w-full max-w-xs mx-auto" />
                    <p className="text-xs text-gray-500">{Math.round(progress)}% complete</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Drag and drop images here, or{' '}
                      <button
                        type="button"
                        onClick={openFileDialog}
                        className="text-primary hover:underline"
                      >
                        click to browse
                      </button>
                    </p>
                    <p className="text-xs text-gray-500">
                      Images will be automatically compressed to WebP format
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                      <span>• Thumbnail: ~100KB, 300px max</span>
                      <span>• Full-size: ~300KB, 1000px max</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Image Previews */}
      {value.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Uploaded Images ({value.length}/{maxImages})</h4>
            {value.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                Optimized for fast loading
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {value.map((image, index) => (
              <Card key={index} className="relative group overflow-hidden">
                <CardContent className="p-2">
                  <div className="relative">
                    {/* Thumbnail preview */}
                    <img
                      src={image.thumbnailUrl}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                      loading="lazy"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(image.fullImageUrl, '_blank')}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(index)}
                          className="h-7 w-7 p-0"
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Size info */}
                  <div className="mt-1 text-xs text-gray-500 text-center">
                    Optimized WebP
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add more button */}
      {canUploadMore && value.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={openFileDialog}
          disabled={disabled || isUploading}
          className="w-full"
        >
          <Image className="h-4 w-4 mr-2" />
          Add More Images ({value.length}/{maxImages})
        </Button>
      )}
    </div>
  );
}