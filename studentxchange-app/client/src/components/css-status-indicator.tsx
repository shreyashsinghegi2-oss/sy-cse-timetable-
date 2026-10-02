import React, { useEffect, useState } from 'react';

interface CSSStatusIndicatorProps {
  onCSSLoaded?: (loaded: boolean) => void;
}

export const CSSStatusIndicator: React.FC<CSSStatusIndicatorProps> = ({ onCSSLoaded }) => {
  const [cssStatus, setCSSStatus] = useState<'loading' | 'loaded' | 'fallback'>('loading');
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max
    
    const checkCSS = () => {
      attempts++;
      
      try {
        // Create test element to verify Tailwind CSS is working
        const testDiv = document.createElement('div');
        testDiv.className = 'bg-blue-500 text-white p-4 hidden';
        testDiv.style.position = 'absolute';
        testDiv.style.left = '-9999px';
        document.body.appendChild(testDiv);
        
        const computedStyle = window.getComputedStyle(testDiv);
        const hasCorrectBackground = computedStyle.backgroundColor === 'rgb(59, 130, 246)' || 
                                    computedStyle.backgroundColor === 'rgb(37, 99, 235)';
        const hasCorrectText = computedStyle.color === 'rgb(255, 255, 255)';
        const hasPadding = parseInt(computedStyle.paddingTop) >= 16;
        const isHidden = computedStyle.display === 'none';
        
        document.body.removeChild(testDiv);
        
        const cssWorking = hasCorrectBackground && hasCorrectText && hasPadding && isHidden;
        
        if (cssWorking) {
          setCSSStatus('loaded');
          onCSSLoaded?.(true);
          return;
        }
      } catch (error) {
        console.warn('CSS check failed:', error);
      }
      
      // Show indicator after 3 seconds if CSS still not loaded
      if (attempts === 6 && cssStatus === 'loading') {
        setShowIndicator(true);
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkCSS, 500);
      } else {
        setCSSStatus('fallback');
        onCSSLoaded?.(false);
        console.warn('⚠️ CSS Status: Using fallback styles');
      }
    };
    
    // Start checking after initial render
    setTimeout(checkCSS, 100);
  }, [cssStatus, onCSSLoaded]);

  // Don't show anything if CSS loaded quickly
  if (cssStatus === 'loaded' && !showIndicator) {
    return null;
  }

  return (
    <div className={`
      fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300
      ${cssStatus === 'loaded' ? 'bg-green-100 text-green-800 border-green-200' : 
        cssStatus === 'fallback' ? 'bg-amber-100 text-amber-800 border-amber-200' : 
        'bg-blue-100 text-blue-800 border-blue-200'}
      ${showIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
    `} style={{
      // Fallback styles in case Tailwind isn't loaded
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: 50,
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: cssStatus === 'loaded' ? '#dcfce7' : 
                      cssStatus === 'fallback' ? '#fef3c7' : '#dbeafe',
      color: cssStatus === 'loaded' ? '#166534' : 
             cssStatus === 'fallback' ? '#92400e' : '#1e40af',
      border: `1px solid ${cssStatus === 'loaded' ? '#bbf7d0' : 
                          cssStatus === 'fallback' ? '#fde68a' : '#bfdbfe'}`,
      transition: 'all 0.3s ease',
      opacity: showIndicator ? 1 : 0,
      transform: showIndicator ? 'translateY(0)' : 'translateY(-8px)'
    }}>
      <div className="flex items-center space-x-2">
        {cssStatus === 'loading' && (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" 
                 style={{
                   width: '16px',
                   height: '16px',
                   border: '2px solid #2563eb',
                   borderTopColor: 'transparent',
                   borderRadius: '50%',
                   animation: 'spin 1s linear infinite'
                 }}></div>
            <span>Loading styles...</span>
          </>
        )}
        {cssStatus === 'loaded' && (
          <>
            <div className="h-4 w-4 text-green-600" style={{ color: '#059669' }}>✓</div>
            <span>Styles loaded!</span>
          </>
        )}
        {cssStatus === 'fallback' && (
          <>
            <div className="h-4 w-4 text-amber-600" style={{ color: '#d97706' }}>⚠</div>
            <span>Safe mode active</span>
          </>
        )}
      </div>
      
      {cssStatus === 'fallback' && (
        <div className="mt-1 text-xs opacity-75">
          Using fallback styles for better compatibility
        </div>
      )}
    </div>
  );
};

export default CSSStatusIndicator;