import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Image, Video, File } from "lucide-react";

interface EnhancedFileUploadProps {
  onFilesChange: (files: File[]) => void;
  acceptedTypes?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
}

export function EnhancedFileUpload({ 
  onFilesChange, 
  acceptedTypes = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi",
  maxFiles = 10,
  maxSizeMB = 50,
  className = ""
}: EnhancedFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file count
    if (selectedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxSizeMB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Files too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    onFilesChange(newFiles);

    // Generate previews for images
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewImages(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesChange(newFiles);

    // Remove corresponding preview if it's an image
    const removedFile = selectedFiles[index];
    if (removedFile.type.startsWith('image/')) {
      const imageIndex = selectedFiles.slice(0, index).filter(f => f.type.startsWith('image/')).length;
      setPreviewImages(prev => prev.filter((_, i) => i !== imageIndex));
    }
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setPreviewImages([]);
    onFilesChange([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
          id="enhanced-file-upload"
        />
        <label htmlFor="enhanced-file-upload" className="cursor-pointer">
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <Button type="button" variant="outline" className="mb-2">
            Choose Files
          </Button>
          <p className="text-sm text-gray-500">
            Images, PDFs, Documents, Videos (Max {maxSizeMB}MB each, {maxFiles} files total)
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {selectedFiles.length}/{maxFiles} files selected
          </p>
        </label>
      </div>

      {/* Image Previews */}
      {previewImages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Image Previews</h4>
            <Badge variant="secondary">{previewImages.length} images</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {previewImages.map((src, index) => (
              <div key={index} className="relative group">
                <img
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                  <Badge variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Preview {index + 1}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Selected Files</h4>
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}