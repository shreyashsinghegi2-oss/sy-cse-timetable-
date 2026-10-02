import { useEffect, useState } from 'react';

export function usePerformance() {
  const [metrics, setMetrics] = useState({
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  });

  useEffect(() => {
    // Network Information API
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const updateMetrics = () => {
        setMetrics({
          connectionType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        });
      };

      updateMetrics();
      connection.addEventListener('change', updateMetrics);
      
      return () => connection.removeEventListener('change', updateMetrics);
    }
  }, []);

  return {
    ...metrics,
    isSlowConnection: metrics.effectiveType === 'slow-2g' || metrics.effectiveType === '2g',
    isFastConnection: metrics.effectiveType === '4g',
    shouldOptimize: metrics.saveData || metrics.downlink < 1,
  };
}

export function useMemoryOptimization() {
  const [memoryInfo, setMemoryInfo] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
    isLowMemory: false
  });

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const limit = memory.jsHeapSizeLimit;
        
        setMemoryInfo({
          usedJSHeapSize: used,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: limit,
          isLowMemory: used / limit > 0.8 // 80% threshold
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 30000); // Check every 30s
    
    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}