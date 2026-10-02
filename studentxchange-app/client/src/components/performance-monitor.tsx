import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Clock, 
  Eye, 
  Globe, 
  Smartphone, 
  Monitor, 
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Custom metrics
  loadTime: number;
  domReady: number;
  resourcesLoaded: number;
  
  // Network info
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  
  // Device info
  deviceType: 'mobile' | 'tablet' | 'desktop';
  viewport: { width: number; height: number };
  
  // Performance score
  score: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);

  useEffect(() => {
    if (isMonitoring) {
      measurePerformance();
      const interval = setInterval(measurePerformance, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const measurePerformance = () => {
    if (!window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    let lcp = 0;
    let fid = 0;
    let cls = 0;
    
    // Measure LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP measurement not supported');
      }
    }

    // Get network information
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    // Determine device type
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (viewport.width < 768) deviceType = 'mobile';
    else if (viewport.width < 1024) deviceType = 'tablet';

    const newMetrics: PerformanceMetrics = {
      lcp: lcp || 0,
      fid: fid || 0,
      cls: cls || 0,
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      ttfb: navigation.responseStart - navigation.requestStart,
      loadTime: navigation.loadEventEnd - navigation.navigationStart,
      domReady: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      resourcesLoaded: performance.getEntriesByType('resource').length,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      deviceType,
      viewport,
      score: calculatePerformanceScore({
        lcp: lcp || 0,
        fid: fid || 0,
        cls: cls || 0,
        fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        ttfb: navigation.responseStart - navigation.requestStart,
        loadTime: navigation.loadEventEnd - navigation.navigationStart
      })
    };

    setMetrics(newMetrics);
    setHistory(prev => [...prev.slice(-9), newMetrics]); // Keep last 10 measurements
  };

  const calculatePerformanceScore = (metrics: Partial<PerformanceMetrics>) => {
    let score = 100;
    
    // Deduct points for poor Core Web Vitals
    if (metrics.lcp && metrics.lcp > 2500) score -= 20;
    else if (metrics.lcp && metrics.lcp > 1800) score -= 10;
    
    if (metrics.fid && metrics.fid > 100) score -= 20;
    else if (metrics.fid && metrics.fid > 50) score -= 10;
    
    if (metrics.cls && metrics.cls > 0.25) score -= 20;
    else if (metrics.cls && metrics.cls > 0.1) score -= 10;
    
    if (metrics.fcp && metrics.fcp > 3000) score -= 15;
    else if (metrics.fcp && metrics.fcp > 1800) score -= 8;
    
    if (metrics.ttfb && metrics.ttfb > 800) score -= 15;
    else if (metrics.ttfb && metrics.ttfb > 400) score -= 8;
    
    if (metrics.loadTime && metrics.loadTime > 5000) score -= 10;
    else if (metrics.loadTime && metrics.loadTime > 3000) score -= 5;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-gray-600">Real-time website performance metrics</p>
        </div>
        <Button
          onClick={() => setIsMonitoring(!isMonitoring)}
          variant={isMonitoring ? "destructive" : "default"}
        >
          {isMonitoring ? (
            <>
              <Activity className="h-4 w-4 mr-2" />
              Stop Monitoring
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Start Monitoring
            </>
          )}
        </Button>
      </div>

      {!metrics && !isMonitoring && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Click "Start Monitoring" to begin tracking performance metrics.
          </AlertDescription>
        </Alert>
      )}

      {metrics && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getScoreColor(metrics.score)}`}>
                    {metrics.score}
                  </div>
                  <div className="mt-2">
                    {getScoreBadge(metrics.score)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Load Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatTime(metrics.loadTime)}
                  </div>
                  <Progress 
                    value={Math.min(100, (3000 - metrics.loadTime) / 30)} 
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Device Type</CardTitle>
                  {metrics.deviceType === 'mobile' ? (
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {metrics.deviceType}
                  </div>
                  <div className="text-sm text-gray-600">
                    {metrics.viewport.width}x{metrics.viewport.height}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection</CardTitle>
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.effectiveType}
                  </div>
                  <div className="text-sm text-gray-600">
                    {metrics.downlink} Mbps
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Performance Tips:</strong> 
                {metrics.score >= 90 ? ' Excellent performance! Your site is well-optimized.' :
                 metrics.score >= 70 ? ' Good performance. Consider optimizing images and reducing JavaScript.' :
                 ' Performance needs improvement. Focus on reducing load times and optimizing resources.'}
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="vitals" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Largest Contentful Paint (LCP)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {formatTime(metrics.lcp)}
                  </div>
                  <Progress 
                    value={Math.min(100, (4000 - metrics.lcp) / 40)} 
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {metrics.lcp <= 2500 ? 'Good' : metrics.lcp <= 4000 ? 'Needs Improvement' : 'Poor'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">First Input Delay (FID)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {formatTime(metrics.fid)}
                  </div>
                  <Progress 
                    value={Math.min(100, (300 - metrics.fid) / 3)} 
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {metrics.fid <= 100 ? 'Good' : metrics.fid <= 300 ? 'Needs Improvement' : 'Poor'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cumulative Layout Shift (CLS)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {metrics.cls.toFixed(3)}
                  </div>
                  <Progress 
                    value={Math.min(100, (0.25 - metrics.cls) * 400)} 
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {metrics.cls <= 0.1 ? 'Good' : metrics.cls <= 0.25 ? 'Needs Improvement' : 'Poor'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">First Contentful Paint (FCP)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {formatTime(metrics.fcp)}
                  </div>
                  <Progress 
                    value={Math.min(100, (3000 - metrics.fcp) / 30)} 
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {metrics.fcp <= 1800 ? 'Good' : metrics.fcp <= 3000 ? 'Needs Improvement' : 'Poor'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time to First Byte (TTFB)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {formatTime(metrics.ttfb)}
                  </div>
                  <Progress 
                    value={Math.min(100, (800 - metrics.ttfb) / 8)} 
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {metrics.ttfb <= 400 ? 'Good' : metrics.ttfb <= 800 ? 'Needs Improvement' : 'Poor'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">DOM Content Loaded</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {formatTime(metrics.domReady)}
                  </div>
                  <Progress 
                    value={Math.min(100, (2000 - metrics.domReady) / 20)} 
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600">
                    {metrics.domReady <= 1000 ? 'Good' : metrics.domReady <= 2000 ? 'Needs Improvement' : 'Poor'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Connection Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <Badge variant="outline">{metrics.connectionType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Effective Type:</span>
                    <Badge variant="outline">{metrics.effectiveType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Downlink:</span>
                    <span className="font-semibold">{metrics.downlink} Mbps</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round Trip Time:</span>
                    <span className="font-semibold">{metrics.rtt}ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Loading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Resources:</span>
                    <span className="font-semibold">{metrics.resourcesLoaded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Time:</span>
                    <span className="font-semibold">{formatTime(metrics.loadTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DOM Ready:</span>
                    <span className="font-semibold">{formatTime(metrics.domReady)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {history.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Performance History</h3>
                <div className="grid grid-cols-1 gap-4">
                  {history.slice(-5).reverse().map((record, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className={`text-xl font-bold ${getScoreColor(record.score)}`}>
                              {record.score}
                            </div>
                            <div>
                              <div className="text-sm text-gray-600">
                                Load: {formatTime(record.loadTime)}
                              </div>
                              <div className="text-sm text-gray-600">
                                LCP: {formatTime(record.lcp)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">
                              {record.deviceType} • {record.effectiveType}
                            </div>
                            <div className="text-sm text-gray-600">
                              {record.viewport.width}x{record.viewport.height}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  No performance history available. Start monitoring to see historical data.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}