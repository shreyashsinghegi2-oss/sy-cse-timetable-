import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ClearCachePage() {
  const [cacheCleared, setCacheCleared] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearAllCaches = async () => {
    setLoading(true);
    
    try {
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }
      
      setCacheCleared(true);
      
      // Force reload after clearing
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Clear Browser Cache</h1>
          
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h2 className="font-medium text-yellow-800 mb-2">Cache Issue Detected</h2>
              <p className="text-yellow-700">
                Your browser may be showing an older version of the site. This can happen when:
              </p>
              <ul className="mt-2 space-y-1 text-yellow-700">
                <li>• Browser cache is storing old files</li>
                <li>• Service worker has cached outdated content</li>
                <li>• DNS cache needs refreshing</li>
                <li>• Multiple deployments created version conflicts</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h2 className="font-medium text-blue-800 mb-2">Quick Solutions</h2>
              <ol className="space-y-2 text-blue-700 list-decimal list-inside">
                <li>Try opening the site in an incognito/private window</li>
                <li>Clear your browser cache manually (Ctrl+Shift+Delete)</li>
                <li>Use the automatic cache clearing below</li>
                <li>Try a different browser or device</li>
              </ol>
            </div>

            <div className="text-center">
              <Button
                onClick={clearAllCaches}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
              >
                {loading ? 'Clearing Cache...' : 'Clear All Cache & Reload'}
              </Button>
            </div>

            {cacheCleared && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h2 className="font-medium text-green-800 mb-2">✅ Cache Cleared Successfully</h2>
                <p className="text-green-700">
                  The page will reload automatically in 2 seconds with the latest version.
                </p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h2 className="font-medium text-gray-800 mb-2">Current Version Info</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Site Version: 3.0 (January 2025)</p>
                <p>• Cache Version: studentxchange-v3</p>
                <p>• Domain: studentxchange.in</p>
                <p>• Last Updated: {new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h2 className="font-medium text-gray-800 mb-2">Manual Cache Clearing</h2>
              <div className="text-sm text-gray-600 space-y-2">
                <p><strong>Chrome:</strong> Ctrl+Shift+Delete → Check all boxes → Clear data</p>
                <p><strong>Firefox:</strong> Ctrl+Shift+Delete → Check all boxes → Clear Now</p>
                <p><strong>Safari:</strong> Cmd+Option+E → Develop menu → Empty Caches</p>
                <p><strong>Edge:</strong> Ctrl+Shift+Delete → Check all boxes → Clear now</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}