import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  structuredData?: any;
  canonical?: string;
}

export default function SEOHead({
  title = 'StudentXchange - India\'s Multi-Service Student Platform | Marketplace, Collaboration & Freelancing',
  description = 'India\'s comprehensive multi-service student platform. Buy & sell educational materials, collaborate on projects, find student freelancing gigs, and build your academic network.',
  keywords = 'student platform India, student marketplace India, buy sell student materials, student freelancing platform, student collaboration platform, college student marketplace, notes marketplace for students, student gigs India, peer-to-peer student platform, campus marketplace',
  image = '/og-image.png',
  type = 'website',
  structuredData,
  canonical
}: SEOHeadProps) {
  const [location] = useLocation();

  useEffect(() => {
    // Update page title
    document.title = title;

    // Update meta description
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Update Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:url', window.location.href, 'property');

    // Update Twitter Card tags
    updateMetaTag('twitter:title', title, 'property');
    updateMetaTag('twitter:description', description, 'property');
    updateMetaTag('twitter:image', image, 'property');

    // Update canonical URL
    if (canonical) {
      updateCanonicalTag(canonical);
    }

    // Update structured data
    if (structuredData) {
      updateStructuredData(structuredData);
    }
  }, [title, description, keywords, image, type, structuredData, canonical, location]);

  return null;
}

function updateMetaTag(name: string, content: string, attribute: string = 'name') {
  let element = document.querySelector(`meta[${attribute}="${name}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateCanonicalTag(url: string) {
  let element = document.querySelector('link[rel="canonical"]');
  
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  
  element.setAttribute('href', url);
}

function updateStructuredData(data: any) {
  // Remove existing structured data
  const existing = document.querySelector('script[type="application/ld+json"]#dynamic-structured-data');
  if (existing) {
    existing.remove();
  }

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'dynamic-structured-data';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}