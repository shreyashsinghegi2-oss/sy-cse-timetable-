import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { CacheManager } from "@/utils/cache-manager";

export function CacheNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  useEffect(() => {
    // Check if cache clearing is needed (but not in preview)
    if (CacheManager.needsCacheClearing() && window.self === window.top) {
      setShowNotification(true);
    }
  }, []);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await CacheManager.clearAllCaches();
      setIsCleared(true);
      setTimeout(() => {
        // Only reload if not in preview environment
        if (window.self === window.top && window.location.hostname !== 'localhost') {
          window.location.reload();
        } else {
          setShowNotification(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Cache clearing failed:', error);
      setIsClearing(false);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          {isCleared ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Cache cleared! Reloading page...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-medium">New version available</p>
              <p className="text-sm">
                Your browser may be showing an older version. Clear cache to get the latest features.
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleClearCache}
                  disabled={isClearing}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isClearing ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    'Clear Cache'
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDismiss}
                  className="text-orange-700 border-orange-300"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}