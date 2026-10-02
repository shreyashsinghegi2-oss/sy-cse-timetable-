import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, FileText, Image, Video, File } from "lucide-react";
import { useState } from "react";

interface FileViewerPopupProps {
  fileName: string;
  fileUrl: string;
  fileType?: string;
  children?: React.ReactNode;
}

export function FileViewerPopup({ fileName, fileUrl, fileType, children }: FileViewerPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (type?.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5 text-red-600" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const renderFilePreview = () => {
    if (!fileType) return null;

    if (fileType.startsWith('image/')) {
      return (
        <div className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: '4/3', minHeight: '200px' }}>
          <img 
            src={fileUrl} 
            alt={fileName}
            className="w-full h-full object-contain"
          />
        </div>
      );
    }

    if (fileType === 'application/pdf') {
      return (
        <div className="w-full h-96 rounded-lg border">
          <embed
            src={fileUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            className="rounded-lg"
          />
        </div>
      );
    }

    if (fileType.startsWith('video/')) {
      return (
        <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <video 
            controls 
            className="w-full h-full"
            preload="metadata"
            style={{ aspectRatio: '16/9' }}
          >
            <source src={fileUrl} type={fileType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // For other file types, show download option
    return (
      <div className="text-center py-8">
        {getFileIcon(fileType)}
        <p className="mt-4 text-gray-600">
          Preview not available for this file type
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => window.open(fileUrl, '_blank')}
        >
          <Download className="w-4 h-4 mr-2" />
          Download File
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFileIcon(fileType || '')}
            {fileName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {renderFilePreview()}
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="text-sm text-gray-500">
            {fileType && (
              <span>Type: {fileType}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => window.open(fileUrl, '_blank')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}