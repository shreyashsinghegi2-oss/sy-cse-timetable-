import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, FileText, Download, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface OLXStyleImageDisplayProps {
  images: string[];
  files: string[];
  productTitle: string;
  className?: string;
  product?: any;
}

export function OLXStyleImageDisplay({ images = [], files = [], productTitle, className, product }: OLXStyleImageDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);

  // Check for seller-uploaded content (prioritize over category fallbacks)
  const hasSellerImages = images && images.length > 0 && images.some(img => 
    img.includes('/uploads/') || 
    img.startsWith('blob:') || 
    img.includes('firebasestorage.googleapis.com') ||
    img.startsWith('http')
  );
  const hasSellerFiles = files && files.length > 0 && files.some(file => 
    file.includes('/uploads/') ||
    file.includes('firebasestorage.googleapis.com') ||
    file.startsWith('http')
  );
  const hasSellerContent = hasSellerImages || hasSellerFiles;
  
  const hasImages = images && images.length > 0;
  const hasFiles = files && files.length > 0;

  // Properly handle URLs for display - convert relative paths to absolute URLs
  const processImageUrl = (url: string) => {
    if (url.startsWith('http')) {
      return url; // Already a full URL (Firebase Storage or external)
    } else {
      return `/uploads/${url}`; // Local file path
    }
  };

  // Show seller-uploaded files as images if no actual images but files exist
  const displayImages = hasImages ? images.map(processImageUrl) : (hasSellerFiles ? files.filter(f => !f.toLowerCase().endsWith('.pdf')).map(processImageUrl) : []);
  const displayFiles = hasFiles ? files.map(processImageUrl) : [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const openFileViewer = (filePath: string) => {
    setCurrentFile(filePath);
    setShowFileViewer(true);
  };

  // Only show "No images uploaded" if truly no seller content exists
  if (!hasSellerContent && (!hasImages || images.every(img => img.includes('unsplash.com'))) && !hasFiles) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center h-48 ${className}`}>
        <div className="text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">No images uploaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Image Display */}
      {(hasImages || hasSellerFiles) && (
        <div className="relative">
          <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
            <DialogTrigger asChild>
              <div className="relative cursor-pointer group rounded-lg overflow-hidden">
                <img
                  src={displayImages[currentImageIndex]}
                  alt={`${productTitle} - Image ${currentImageIndex + 1}`}
                  className="w-full h-64 object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                {/* Image Counter */}
                {displayImages.length > 1 && (
                  <Badge className="absolute top-3 right-3 bg-black bg-opacity-70 text-white">
                    {currentImageIndex + 1}/{displayImages.length}
                  </Badge>
                )}
              </div>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] p-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                  onClick={() => setShowImageViewer(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <img
                  src={displayImages[currentImageIndex]}
                  alt={`${productTitle} - Image ${currentImageIndex + 1}`}
                  className="w-full max-h-[80vh] object-contain rounded-lg"
                />
                
                {displayImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Image Navigation Dots */}
          {displayImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {displayImages.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          )}

          {/* Thumbnail Slider for Multiple Images */}
          {displayImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* File Attachments */}
      {displayFiles.length > 0 && (
        <Card className="p-3 bg-gray-50">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Attached Files ({displayFiles.length})
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {displayFiles.map((file, index) => {
              const fileName = file.split('/').pop() || 'Unknown file';
              const fileExtension = fileName.split('.').pop()?.toLowerCase();
              
              return (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto p-2"
                      onClick={() => openFileViewer(file)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <FileText className="h-4 w-4 flex-shrink-0 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{fileName}</div>
                          <div className="text-xs text-gray-500 uppercase">{fileExtension}</div>
                        </div>
                      </div>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-4xl max-h-[90vh]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{fileName}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={file} download target="_blank">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </div>
                      </div>
                      
                      {fileExtension === 'pdf' ? (
                        <iframe
                          src={file}
                          className="w-full h-[70vh] border rounded-lg"
                          title={fileName}
                        />
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <FileText className="h-16 w-16 mx-auto mb-4" />
                          <p>Preview not available for this file type</p>
                          <p className="text-sm">Click download to view the file</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default OLXStyleImageDisplay;